<?php

namespace App\Http\Resources;

use App\Models\WineMovement;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin WineMovement
 */
class MovementResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var WineMovement $movement */
        $movement = $this->resource;

        return [
            'id' => $movement->id,
            'type' => $movement->type->value,
            'wineId' => $movement->wine_id,
            'wineName' => $movement->wine_name,
            'wineVintage' => $movement->wine_vintage,
            'wineCategory' => $movement->wine_category->value,
            'quantity' => $movement->quantity,
            'rating' => $movement->rating,
            'note' => $movement->note,
            'createdAt' => $movement->created_at?->toIso8601String(),
            'user' => $movement->relationLoaded('user') && $movement->user !== null
                ? ['id' => $movement->user->id, 'name' => $movement->user->name]
                : null,
            'from' => $movement->relationLoaded('fromCompartment') ? $movement->fromCompartment?->name : null,
            'to' => $movement->relationLoaded('toCompartment') ? $movement->toCompartment?->name : null,
        ];
    }
}
