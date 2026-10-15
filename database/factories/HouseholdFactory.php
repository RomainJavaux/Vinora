<?php

namespace Database\Factories;

use App\Models\Household;
use App\Models\User;
use App\Support\Palette;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Household>
 */
class HouseholdFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->randomElement(['La maison', 'La maison de campagne', 'Chez nous', 'Le chalet']),
            'emoji' => fake()->randomElement(['🏠', '🏡', '🏔️', '🍇']),
            'color' => fake()->randomElement(Palette::keys()),
            'share_prices' => true,
            'owner_id' => User::factory(),
        ];
    }
}
