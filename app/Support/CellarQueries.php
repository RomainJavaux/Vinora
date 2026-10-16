<?php

namespace App\Support;

use App\Http\Resources\CellarResource;
use App\Models\Cellar;
use App\Models\Compartment;
use App\Models\Household;
use App\Models\Wine;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class CellarQueries
{
    /**
     * Cellars of the household with the bottles in stock of every
     * compartment (used to draw the illustrations).
     *
     * @return Collection<int, Cellar>
     */
    public static function withStock(Household $household, bool $withCreator = false): Collection
    {
        return $household->cellars()
            ->with([
                'compartments.wines' => fn (HasMany $query) => $query
                    ->whereNull('finished_at')
                    ->where('quantity', '>', 0)
                    ->when($withCreator, fn ($q) => $q->with('creator')),
            ])
            ->get()
            ->each(function (Cellar $cellar) {
                foreach ($cellar->compartments as $compartment) {
                    $compartment->setRelation('cellar', $cellar);

                    foreach ($compartment->wines as $wine) {
                        $wine->setRelation('compartment', $compartment);
                    }
                }
            });
    }

    /**
     * Light list of cellars and their compartments, for the location pickers.
     *
     * @return list<array<string, mixed>>
     */
    public static function options(Household $household): array
    {
        return array_values(self::withStock($household)
            ->map(fn (Cellar $cellar) => [
                'id' => $cellar->id,
                'name' => $cellar->name,
                'type' => $cellar->type->value,
                'color' => $cellar->color,
                'compartments' => array_values($cellar->compartments->map(fn (Compartment $compartment) => [
                    'id' => $compartment->id,
                    'name' => $compartment->name,
                    'position' => $compartment->position,
                    'capacity' => $compartment->capacity !== null ? $compartment->capacity * max(1, $cellar->depth) : null,
                    'frontCapacity' => $compartment->capacity,
                    'itemsCount' => $compartment->wines->count(),
                    'units' => (int) $compartment->wines->sum('quantity'),
                    'previewBottles' => self::preview($compartment->wines),
                ])->all()),
            ])
            ->all());
    }

    /**
     * The colours of the bottles of a compartment, one entry per bottle,
     * those to drink first first (used to draw the bottles).
     *
     * @param  iterable<Wine>  $wines
     * @return list<string>
     */
    public static function preview(iterable $wines, int $limit = CellarResource::PREVIEW_LIMIT): array
    {
        $sorted = collect($wines)->sortBy(fn (Wine $wine) => $wine->drink_until ?? PHP_INT_MAX);
        $preview = [];

        foreach ($sorted as $wine) {
            for ($i = 0; $i < $wine->quantity && count($preview) < $limit; $i++) {
                $preview[] = $wine->category->value;
            }
        }

        return $preview;
    }
}
