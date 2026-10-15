<?php

namespace Database\Factories;

use App\Enums\AgingPotential;
use App\Enums\BottleFormat;
use App\Enums\WineCategory;
use App\Models\Household;
use App\Models\Wine;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Wine>
 */
class WineFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $quantity = fake()->numberBetween(1, 12);
        $vintage = fake()->numberBetween(now()->year - 12, now()->year - 1);

        return [
            'household_id' => Household::factory(),
            'name' => 'Château '.fake()->lastName(),
            'producer' => null,
            'category' => WineCategory::Red,
            'vintage' => $vintage,
            'appellation' => 'Pauillac',
            'region' => 'Bordeaux',
            'country' => 'France',
            'grapes' => ['Cabernet Sauvignon', 'Merlot'],
            'quantity' => $quantity,
            'initial_quantity' => $quantity,
            'format' => BottleFormat::Standard,
            'aging' => AgingPotential::Medium,
            'drink_from' => $vintage + 3,
            'drink_until' => $vintage + 8,
            'tags' => [],
        ];
    }

    public function finished(): static
    {
        return $this->state(fn () => [
            'quantity' => 0,
            'finished_at' => now(),
        ]);
    }
}
