<?php

namespace Tests;

use App\Actions\Households\CreateHousehold;
use App\Enums\HouseholdRole;
use App\Models\Cellar;
use App\Models\Compartment;
use App\Models\Household;
use App\Models\User;
use App\Models\Wine;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Fortify\Features;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    protected function skipUnlessFortifyHas(string $feature, ?string $message = null): void
    {
        if (! Features::enabled($feature)) {
            $this->markTestSkipped($message ?? "Fortify feature [{$feature}] is not enabled.");
        }
    }

    /**
     * A user who owns a household with a cellar of three compartments.
     *
     * @return array{0: User, 1: Household, 2: Cellar}
     */
    protected function userWithCellar(?User $user = null): array
    {
        $user ??= User::factory()->create();
        $household = app(CreateHousehold::class)->handle($user, ['name' => 'La maison', 'emoji' => '🏡', 'color' => 'bordeaux']);
        $cellar = Cellar::factory()->withCompartments(3)->create(['household_id' => $household->id]);

        return [$user->refresh(), $household, $cellar->load('compartments')];
    }

    protected function joinHousehold(Household $household, HouseholdRole $role = HouseholdRole::Member, ?User $user = null): User
    {
        $user ??= User::factory()->create();
        $household->members()->attach($user->id, ['role' => $role->value]);
        $user->switchHousehold($household);

        return $user->refresh();
    }

    protected function compartment(Cellar $cellar, int $index = 0): Compartment
    {
        /** @var Compartment $compartment */
        $compartment = $cellar->compartments()->get()[$index];

        return $compartment;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function wineIn(Compartment $compartment, array $attributes = []): Wine
    {
        return Wine::factory()->create([
            'household_id' => $compartment->cellar->household_id,
            'compartment_id' => $compartment->id,
            ...$attributes,
        ]);
    }
}
