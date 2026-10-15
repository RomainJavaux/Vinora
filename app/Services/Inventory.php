<?php

namespace App\Services;

use App\Enums\AgingPotential;
use App\Enums\DiscardReason;
use App\Enums\MovementType;
use App\Enums\WineCategory;
use App\Models\Household;
use App\Models\User;
use App\Models\Wine;
use App\Models\WineMovement;
use App\Support\DrinkWindow;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

/**
 * The one place where bottles enter, move and leave the cellars. Every
 * operation runs in a transaction and writes a movement to the journal.
 */
class Inventory
{
    public function __construct(private readonly PhotoStore $photos) {}

    /**
     * Store a new lot of bottles.
     *
     * @param  array<string, mixed>  $data
     */
    public function add(Household $household, User $user, array $data, ?UploadedFile $photo = null, ?Wine $source = null): Wine
    {
        $photoPath = $photo !== null
            ? $this->photos->store($photo, $household->id)
            : ($source !== null ? $this->photos->duplicate($source->photo_path, $household->id) : null);

        return DB::transaction(function () use ($household, $user, $data, $photoPath) {
            $quantity = (int) $data['quantity'];

            $wine = new Wine([
                ...$this->withWindow($data),
                'household_id' => $household->id,
                'created_by' => $user->id,
                'photo_path' => $photoPath,
                'quantity' => $quantity,
                'initial_quantity' => $quantity,
            ]);
            $wine->save();

            $this->record($wine, $user, MovementType::Added, [
                'quantity' => $quantity,
                'to_compartment_id' => $wine->compartment_id,
            ]);

            return $wine;
        });
    }

    /**
     * Open bottles. A tasting note and a rating out of 5 can go with it.
     */
    public function drink(Wine $wine, User $user, int $quantity, ?int $rating = null, ?string $note = null): Wine
    {
        return DB::transaction(function () use ($wine, $user, $quantity, $rating, $note) {
            $wine = $this->takeOut($wine, $user, MovementType::Drunk, $quantity, [
                'rating' => $rating,
                'note' => $note,
            ]);

            if ($rating !== null) {
                $average = WineMovement::query()
                    ->where('wine_id', $wine->id)
                    ->where('type', MovementType::Drunk)
                    ->whereNotNull('rating')
                    ->avg('rating');

                $wine->forceFill(['rating' => $average !== null ? round((float) $average, 1) : null])->save();
            }

            return $wine;
        });
    }

    /**
     * Give bottles away.
     */
    public function gift(Wine $wine, User $user, int $quantity, ?string $recipient = null): Wine
    {
        return DB::transaction(fn () => $this->takeOut($wine, $user, MovementType::Gifted, $quantity, [
            'note' => $recipient,
        ]));
    }

    /**
     * Put bottles back in the same lot (bought again, found a forgotten one…).
     */
    public function restock(Wine $wine, User $user, int $quantity, ?int $compartmentId = null): Wine
    {
        return DB::transaction(function () use ($wine, $user, $quantity, $compartmentId) {
            /** @var Wine $wine */
            $wine = Wine::query()->lockForUpdate()->findOrFail($wine->id);
            $from = $wine->compartment_id;
            $total = $wine->quantity + $quantity;

            $wine->forceFill([
                'quantity' => $total,
                'initial_quantity' => max($wine->initial_quantity, $total),
                'finished_at' => null,
                'compartment_id' => $compartmentId ?? $wine->compartment_id,
            ])->save();

            $this->record($wine, $user, MovementType::Restocked, [
                'quantity' => $quantity,
                'from_compartment_id' => $from !== $wine->compartment_id ? $from : null,
                'to_compartment_id' => $wine->compartment_id,
            ]);

            return $wine;
        });
    }

    /**
     * Move the whole lot, or only some bottles, to another compartment. When
     * only some bottles move, they join an identical lot already stored
     * there, or a new lot is created for them.
     *
     * Returns the lot that now holds the moved bottles.
     */
    public function move(Wine $wine, User $user, int $compartmentId, ?int $quantity = null): Wine
    {
        return DB::transaction(function () use ($wine, $user, $compartmentId, $quantity) {
            /** @var Wine $wine */
            $wine = Wine::query()->lockForUpdate()->findOrFail($wine->id);
            $from = $wine->compartment_id;

            if ($from === $compartmentId) {
                return $wine;
            }

            $quantity = $quantity === null ? $wine->quantity : max(1, min($quantity, $wine->quantity));

            if ($quantity >= $wine->quantity) {
                $wine->forceFill(['compartment_id' => $compartmentId])->save();

                $this->record($wine, $user, MovementType::Moved, [
                    'quantity' => $wine->quantity,
                    'from_compartment_id' => $from,
                    'to_compartment_id' => $compartmentId,
                ]);

                return $wine;
            }

            $target = $this->findTwin($wine, $compartmentId);

            if ($target !== null) {
                $total = $target->quantity + $quantity;
                $target->forceFill([
                    'quantity' => $total,
                    'initial_quantity' => max($target->initial_quantity, $total),
                ])->save();
            } else {
                $target = $wine->replicate(['created_at', 'updated_at']);
                $target->forceFill([
                    'compartment_id' => $compartmentId,
                    'created_by' => $user->id,
                    'quantity' => $quantity,
                    'initial_quantity' => $quantity,
                    'finished_at' => null,
                    'photo_path' => $this->photos->duplicate($wine->photo_path, $wine->household_id),
                ])->save();
            }

            $wine->forceFill(['quantity' => $wine->quantity - $quantity])->save();

            $this->record($wine, $user, MovementType::Moved, [
                'quantity' => $quantity,
                'from_compartment_id' => $from,
                'to_compartment_id' => $compartmentId,
            ]);

            return $target;
        });
    }

    /**
     * Throw the remaining bottles away (corked, oxidised, broken…).
     */
    public function discard(Wine $wine, User $user, DiscardReason $reason, ?string $note = null): Wine
    {
        return DB::transaction(function () use ($wine, $user, $reason, $note) {
            /** @var Wine $wine */
            $wine = Wine::query()->lockForUpdate()->findOrFail($wine->id);
            $quantity = $wine->quantity;

            $wine->forceFill(['quantity' => 0, 'finished_at' => now()])->save();

            $this->record($wine, $user, MovementType::Discarded, [
                'quantity' => $quantity,
                'from_compartment_id' => $wine->compartment_id,
                'note' => trim($reason->label().($note !== null && $note !== '' ? " — {$note}" : '')),
            ]);

            return $wine;
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Wine $wine, User $user, array $data, ?UploadedFile $photo = null, bool $removePhoto = false): Wine
    {
        $newPhoto = $photo !== null ? $this->photos->store($photo, $wine->household_id) : null;
        $oldPhoto = $wine->photo_path;

        $wine = DB::transaction(function () use ($wine, $user, $data, $newPhoto, $removePhoto) {
            $from = $wine->compartment_id;
            $attributes = Arr::except($this->withWindow($data), ['quantity']);

            if (array_key_exists('quantity', $data) && $data['quantity'] !== null) {
                $quantity = (int) $data['quantity'];
                $attributes['quantity'] = $quantity;
                $attributes['initial_quantity'] = max($wine->initial_quantity, $quantity);
                $attributes['finished_at'] = $quantity > 0 ? null : ($wine->finished_at ?? now());
            }

            if ($newPhoto !== null) {
                $attributes['photo_path'] = $newPhoto;
            } elseif ($removePhoto) {
                $attributes['photo_path'] = null;
            }

            $wine->forceFill($attributes)->save();

            $this->record($wine, $user, MovementType::Updated);

            if ($from !== $wine->compartment_id) {
                $this->record($wine, $user, MovementType::Moved, [
                    'quantity' => $wine->quantity,
                    'from_compartment_id' => $from,
                    'to_compartment_id' => $wine->compartment_id,
                ]);
            }

            return $wine;
        });

        if (($newPhoto !== null || $removePhoto) && $oldPhoto !== null && $oldPhoto !== $wine->photo_path) {
            $this->photos->delete($oldPhoto);
        }

        return $wine;
    }

    /**
     * Delete the lot and its photo. The journal keeps its copy of the name.
     */
    public function delete(Wine $wine): void
    {
        $photo = $wine->photo_path;

        $wine->delete();

        $this->photos->delete($photo);
    }

    /**
     * @param  array<string, mixed>  $extra
     */
    private function takeOut(Wine $wine, User $user, MovementType $type, int $quantity, array $extra = []): Wine
    {
        /** @var Wine $wine */
        $wine = Wine::query()->lockForUpdate()->findOrFail($wine->id);
        $quantity = max(1, min($quantity, $wine->quantity));
        $left = $wine->quantity - $quantity;

        $wine->forceFill([
            'quantity' => $left,
            'finished_at' => $left === 0 ? now() : null,
        ])->save();

        $this->record($wine, $user, $type, [
            ...$extra,
            'quantity' => $quantity,
            'from_compartment_id' => $wine->compartment_id,
        ]);

        return $wine;
    }

    /**
     * An identical lot (same wine, vintage and format) stored in the given
     * compartment.
     */
    private function findTwin(Wine $wine, int $compartmentId): ?Wine
    {
        return Wine::query()
            ->where('household_id', $wine->household_id)
            ->where('compartment_id', $compartmentId)
            ->whereKeyNot($wine->id)
            ->inStock()
            ->get()
            ->first(fn (Wine $candidate) => $candidate->identityKey() === $wine->identityKey());
    }

    /**
     * Fill the drinking window from the ageing potential when none was given.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function withWindow(array $data): array
    {
        $hasWindow = ($data['drink_from'] ?? null) !== null || ($data['drink_until'] ?? null) !== null;

        if ($hasWindow || ! isset($data['category'])) {
            return $data;
        }

        $category = $data['category'] instanceof WineCategory ? $data['category'] : WineCategory::from($data['category']);
        $aging = isset($data['aging'])
            ? ($data['aging'] instanceof AgingPotential ? $data['aging'] : AgingPotential::tryFrom($data['aging']))
            : null;
        $baseYear = isset($data['purchased_on']) ? CarbonImmutable::parse($data['purchased_on'])->year : null;

        $window = DrinkWindow::suggest($category, $aging, isset($data['vintage']) ? (int) $data['vintage'] : null, $baseYear);

        return [
            ...$data,
            'aging' => $aging ?? $category->defaultAging(),
            'drink_from' => $window[0] ?? null,
            'drink_until' => $window[1] ?? null,
        ];
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function record(Wine $wine, ?User $user, MovementType $type, array $attributes = []): WineMovement
    {
        return WineMovement::query()->create([
            'household_id' => $wine->household_id,
            'wine_id' => $wine->id,
            'user_id' => $user?->id,
            'type' => $type,
            'wine_name' => $wine->name,
            'wine_vintage' => $wine->vintage,
            'wine_category' => $wine->category,
            'created_at' => now(),
            ...$attributes,
        ]);
    }
}
