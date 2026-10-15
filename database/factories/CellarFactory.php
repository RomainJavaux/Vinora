<?php

namespace Database\Factories;

use App\Enums\CellarType;
use App\Models\Cellar;
use App\Models\Household;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Cellar>
 */
class CellarFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'household_id' => Household::factory(),
            'name' => 'Cave du salon',
            'type' => CellarType::Cabinet,
            'color' => 'bordeaux',
            'location' => 'Salon',
            'position' => 1,
        ];
    }

    /**
     * Create the given number of compartments with the cellar.
     */
    public function withCompartments(int $count = 3, int $capacity = 8): static
    {
        return $this->afterCreating(function (Cellar $cellar) use ($count, $capacity) {
            foreach ($cellar->type->defaultNames($count) as $index => $name) {
                $cellar->compartments()->create([
                    'name' => $name,
                    'capacity' => $capacity,
                    'position' => $index + 1,
                ]);
            }
        });
    }
}
