<?php

namespace App\Models;

use App\Enums\AgingPotential;
use App\Enums\BottleFormat;
use App\Enums\WineCategory;
use App\Support\DrinkWindow;
use Carbon\CarbonImmutable;
use Database\Factories\WineFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

/**
 * A lot of bottles of the same wine (same cuvée, vintage and format) stored
 * in one compartment.
 *
 * @property int $id
 * @property int $household_id
 * @property int|null $compartment_id
 * @property int|null $created_by
 * @property string $name
 * @property string|null $producer
 * @property WineCategory $category
 * @property int|null $vintage
 * @property string|null $appellation
 * @property string|null $region
 * @property string|null $country
 * @property list<string>|null $grapes
 * @property float|null $alcohol
 * @property string|null $description
 * @property string|null $photo_path
 * @property int $quantity
 * @property int $initial_quantity
 * @property BottleFormat $format
 * @property int|null $price_cents
 * @property int|null $value_cents
 * @property CarbonImmutable|null $purchased_on
 * @property string|null $bought_from
 * @property AgingPotential|null $aging
 * @property int|null $drink_from
 * @property int|null $drink_until
 * @property list<string>|null $tags
 * @property float|null $rating
 * @property CarbonImmutable|null $finished_at
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read Household $household
 * @property-read Compartment|null $compartment
 * @property-read User|null $creator
 */
#[Fillable([
    'household_id', 'compartment_id', 'created_by', 'name', 'producer', 'category', 'vintage', 'appellation',
    'region', 'country', 'grapes', 'alcohol', 'description', 'photo_path', 'quantity', 'initial_quantity',
    'format', 'price_cents', 'value_cents', 'purchased_on', 'bought_from', 'aging', 'drink_from',
    'drink_until', 'tags', 'rating', 'finished_at',
])]
class Wine extends Model
{
    /** @use HasFactory<WineFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'category' => WineCategory::class,
            'format' => BottleFormat::class,
            'aging' => AgingPotential::class,
            'vintage' => 'integer',
            'grapes' => 'array',
            'tags' => 'array',
            'alcohol' => 'float',
            'rating' => 'float',
            'quantity' => 'integer',
            'initial_quantity' => 'integer',
            'price_cents' => 'integer',
            'value_cents' => 'integer',
            'drink_from' => 'integer',
            'drink_until' => 'integer',
            'purchased_on' => 'date',
            'finished_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Household, $this>
     */
    public function household(): BelongsTo
    {
        return $this->belongsTo(Household::class);
    }

    /**
     * @return BelongsTo<Compartment, $this>
     */
    public function compartment(): BelongsTo
    {
        return $this->belongsTo(Compartment::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<WineMovement, $this>
     */
    public function movements(): HasMany
    {
        return $this->hasMany(WineMovement::class)->latest('created_at')->latest('id');
    }

    /**
     * @param  Builder<Wine>  $query
     * @return Builder<Wine>
     */
    public function scopeInStock(Builder $query): Builder
    {
        return $query->whereNull('finished_at')->where('quantity', '>', 0);
    }

    /**
     * @param  Builder<Wine>  $query
     * @return Builder<Wine>
     */
    public function scopeFinished(Builder $query): Builder
    {
        return $query->whereNotNull('finished_at');
    }

    /**
     * Wines whose window ends this year or is already over: drink them now.
     *
     * @param  Builder<Wine>  $query
     * @return Builder<Wine>
     */
    public function scopeUrgent(Builder $query, ?int $year = null): Builder
    {
        return $query->whereNotNull('drink_until')->where('drink_until', '<=', $year ?? now()->year);
    }

    /**
     * Wines that are inside their drinking window.
     *
     * @param  Builder<Wine>  $query
     * @return Builder<Wine>
     */
    public function scopeReady(Builder $query, ?int $year = null): Builder
    {
        $year ??= now()->year;

        return $query
            ->where(fn (Builder $q) => $q->whereNull('drink_from')->orWhere('drink_from', '<=', $year))
            ->where(fn (Builder $q) => $q->whereNull('drink_until')->orWhere('drink_until', '>=', $year))
            ->where(fn (Builder $q) => $q->whereNotNull('drink_from')->orWhereNotNull('drink_until'));
    }

    /**
     * @return array{status: string, from: int|null, until: int|null, daysLeft: int|null, daysUntilReady: int|null, progress: float|null}
     */
    public function window(): array
    {
        return DrinkWindow::describe($this->drink_from, $this->drink_until, $this->vintage, $this->purchased_on ?? $this->created_at);
    }

    public function windowStatus(): string
    {
        return DrinkWindow::status($this->drink_from, $this->drink_until);
    }

    public function isUrgent(): bool
    {
        return in_array($this->windowStatus(), [DrinkWindow::SOON, DrinkWindow::PAST], true);
    }

    public function photoUrl(): ?string
    {
        return $this->photo_path !== null ? Storage::disk('public')->url($this->photo_path) : null;
    }

    /** The cuvée and its vintage, e.g. "Château Talbot 2016". */
    public function fullName(): string
    {
        return $this->vintage !== null ? "{$this->name} {$this->vintage}" : $this->name;
    }

    /**
     * Identity of the wine regardless of where its bottles are stored.
     */
    public function identityKey(): string
    {
        return mb_strtolower(implode('|', [
            trim($this->name),
            trim((string) $this->producer),
            (string) $this->vintage,
            $this->format->value,
            $this->category->value,
        ]));
    }

    /** Estimated value of one bottle, in cents. */
    public function unitValueCents(): ?int
    {
        return $this->value_cents ?? $this->price_cents;
    }
}
