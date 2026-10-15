<?php

namespace App\Actions\Cellars;

use App\Models\Cellar;
use App\Models\Compartment;
use App\Models\Household;
use App\Models\Wine;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class SaveCellar
{
    /**
     * Create or update a cellar and synchronise its ordered compartments:
     * known ids are renamed and repositioned, new ones are created and the
     * missing ones are deleted — their bottles move to the first remaining
     * compartment.
     *
     * @param  array<string, mixed>  $data
     */
    public function handle(Household $household, array $data, ?Cellar $cellar = null): Cellar
    {
        return DB::transaction(function () use ($household, $data, $cellar) {
            $attributes = Arr::only($data, ['name', 'type', 'color', 'location', 'notes', 'temperature', 'humidity']);

            if ($cellar === null) {
                $cellar = new Cellar([
                    ...$attributes,
                    'household_id' => $household->id,
                    'position' => (int) $household->cellars()->max('position') + 1,
                ]);
            } else {
                $cellar->fill($attributes);
            }

            $cellar->save();

            /** @var list<array{id?: int|null, name: string, color?: string|null, capacity?: int|null}> $compartments */
            $compartments = $data['compartments'] ?? [];
            $type = $cellar->type;

            $existing = $cellar->compartments()->get()->keyBy('id');
            $kept = [];

            foreach ($compartments as $index => $row) {
                $values = [
                    'name' => $row['name'],
                    'color' => $row['color'] ?? null,
                    'capacity' => $row['capacity'] ?? $type->defaultCapacity(),
                    'position' => $index + 1,
                ];

                $id = isset($row['id']) ? (int) $row['id'] : null;

                if ($id !== null && $existing->has($id)) {
                    /** @var Compartment $compartment */
                    $compartment = $existing->get($id);
                    $compartment->fill($values)->save();
                } else {
                    $compartment = $cellar->compartments()->create($values);
                }

                $kept[] = $compartment->id;
            }

            $removed = $existing->keys()->diff($kept)->all();

            if ($removed !== []) {
                Wine::query()->whereIn('compartment_id', $removed)->update(['compartment_id' => $kept[0] ?? null]);
                Compartment::query()->whereIn('id', $removed)->delete();
            }

            return $cellar->refresh();
        });
    }
}
