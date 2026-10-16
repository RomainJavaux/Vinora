<?php

namespace App\Http\Resources;

use App\Models\Cellar;
use App\Models\Compartment;
use App\Models\Wine;
use App\Support\CellarQueries;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Cellar
 */
class CellarResource extends JsonResource
{
    /** Maximum number of bottles drawn on a compartment of the illustration. */
    public const PREVIEW_LIMIT = 36;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Cellar $cellar */
        $cellar = $this->resource;

        $compartments = $cellar->relationLoaded('compartments')
            ? $cellar->compartments->map(fn (Compartment $compartment) => $this->compartment($compartment, $request, max(1, $cellar->depth)))->values()->all()
            : [];

        return [
            'id' => $cellar->id,
            'name' => $cellar->name,
            'type' => $cellar->type->value,
            'color' => $cellar->color,
            'location' => $cellar->location,
            'notes' => $cellar->notes,
            'temperature' => $cellar->temperature,
            'humidity' => $cellar->humidity,
            'depth' => max(1, $cellar->depth),
            'position' => $cellar->position,
            'compartments' => $compartments,
            'stats' => [
                'items' => array_sum(array_column($compartments, 'itemsCount')),
                'units' => array_sum(array_column($compartments, 'units')),
                'urgent' => array_sum(array_column($compartments, 'urgentCount')),
                'capacity' => array_sum(array_map(fn (array $c) => (int) ($c['capacity'] ?? 0), $compartments)),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function compartment(Compartment $compartment, Request $request, int $depth): array
    {
        // "capacity" counts every place (front x depth), "frontCapacity" the
        // bottles seen from the front, the ones drawn on the illustration.
        $front = $compartment->capacity;
        $capacity = $front !== null ? $front * $depth : null;

        $loaded = $compartment->relationLoaded('wines');

        if ($loaded) {
            $wines = $compartment->wines
                ->filter(fn (Wine $wine) => $wine->finished_at === null && $wine->quantity > 0)
                ->sortBy([
                    fn (Wine $a, Wine $b) => ($a->drink_until ?? PHP_INT_MAX) <=> ($b->drink_until ?? PHP_INT_MAX),
                    fn (Wine $a, Wine $b) => strcmp($a->name, $b->name),
                ])
                ->values();

            return [
                'id' => $compartment->id,
                'name' => $compartment->name,
                'color' => $compartment->color,
                'capacity' => $capacity,
                'frontCapacity' => $front,
                'position' => $compartment->position,
                'itemsCount' => $wines->count(),
                'units' => (int) $wines->sum('quantity'),
                'urgentCount' => $wines->filter(fn (Wine $wine) => $wine->isUrgent())->count(),
                'previewBottles' => CellarQueries::preview($wines),
                'items' => WineResource::collection($wines)->resolve($request),
            ];
        }

        return [
            'id' => $compartment->id,
            'name' => $compartment->name,
            'color' => $compartment->color,
            'capacity' => $capacity,
            'frontCapacity' => $front,
            'position' => $compartment->position,
            'itemsCount' => (int) ($compartment->getAttribute('wines_count') ?? 0),
            'units' => (int) ($compartment->getAttribute('wines_sum_quantity') ?? 0),
            'urgentCount' => (int) ($compartment->getAttribute('urgent_count') ?? 0),
            'previewBottles' => [],
            'items' => null,
        ];
    }
}
