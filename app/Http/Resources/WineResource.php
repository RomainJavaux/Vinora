<?php

namespace App\Http\Resources;

use App\Models\Wine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Wine
 */
class WineResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Wine $wine */
        $wine = $this->resource;
        $canSeePrices = (bool) $request->attributes->get('canSeePrices', true);

        $compartment = $wine->relationLoaded('compartment') ? $wine->compartment : null;
        $cellar = $compartment !== null && $compartment->relationLoaded('cellar') ? $compartment->cellar : null;

        return [
            'id' => $wine->id,
            'name' => $wine->name,
            'producer' => $wine->producer,
            'category' => $wine->category->value,
            'vintage' => $wine->vintage,
            'appellation' => $wine->appellation,
            'region' => $wine->region,
            'country' => $wine->country,
            'grapes' => $wine->grapes ?? [],
            'alcohol' => $wine->alcohol,
            'description' => $wine->description,
            'photoUrl' => $wine->photoUrl(),
            'quantity' => $wine->quantity,
            'initialQuantity' => $wine->initial_quantity,
            'format' => $wine->format->value,
            'priceCents' => $canSeePrices ? $wine->price_cents : null,
            'valueCents' => $canSeePrices ? $wine->value_cents : null,
            'purchasedOn' => $wine->purchased_on?->toDateString(),
            'boughtFrom' => $wine->bought_from,
            'aging' => $wine->aging?->value,
            'drinkFrom' => $wine->drink_from,
            'drinkUntil' => $wine->drink_until,
            'tags' => $wine->tags ?? [],
            'rating' => $wine->rating,
            'finishedAt' => $wine->finished_at?->toIso8601String(),
            'createdAt' => $wine->created_at?->toIso8601String(),
            'window' => $wine->window(),
            'compartmentId' => $wine->compartment_id,
            'location' => $compartment !== null && $cellar !== null ? [
                'cellarId' => $cellar->id,
                'cellarName' => $cellar->name,
                'cellarColor' => $cellar->color,
                'cellarType' => $cellar->type->value,
                'compartmentId' => $compartment->id,
                'compartmentName' => $compartment->name,
                'compartmentPosition' => $compartment->position,
            ] : null,
            'createdBy' => $this->when($wine->relationLoaded('creator'), fn () => $wine->creator !== null ? [
                'id' => $wine->creator->id,
                'name' => $wine->creator->name,
            ] : null),
        ];
    }
}
