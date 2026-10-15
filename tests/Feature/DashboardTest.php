<?php

namespace Tests\Feature;

use App\Enums\MovementType;
use App\Models\User;
use App\Models\WineMovement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page(): void
    {
        $this->get(route('dashboard'))->assertRedirect(route('login'));
    }

    public function test_users_without_household_go_to_the_onboarding(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('dashboard'))
            ->assertRedirect(route('onboarding'));
    }

    public function test_the_dashboard_shows_the_cellar_figures(): void
    {
        [$user, $household, $cellar] = $this->userWithCellar();
        $year = now()->year;

        $this->wineIn($this->compartment($cellar), ['quantity' => 6, 'initial_quantity' => 6, 'drink_from' => $year - 2, 'drink_until' => $year + 5, 'price_cents' => 2000]);
        $this->wineIn($this->compartment($cellar, 1), ['quantity' => 2, 'initial_quantity' => 2, 'drink_from' => $year - 6, 'drink_until' => $year]);
        $this->wineIn($this->compartment($cellar, 2), ['quantity' => 3, 'initial_quantity' => 3, 'drink_from' => $year + 3, 'drink_until' => $year + 12]);

        WineMovement::query()->create([
            'household_id' => $household->id,
            'type' => MovementType::Added,
            'wine_name' => 'Test',
            'wine_category' => 'red',
            'quantity' => 11,
            'created_at' => now(),
        ]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dashboard')
                ->where('stats.items', 3)
                ->where('stats.units', 11)
                ->where('stats.urgent', 2)
                ->where('stats.ready', 6)
                ->where('stats.young', 3)
                ->where('stats.valueCents', 12000)
                ->where('stats.addedThisMonth', 11)
                ->has('priority', 2)
                ->where('priority.0.window.status', 'soon')
                ->has('cellars', 1)
                ->where('household.name', 'La maison')
                ->where('household.role', 'owner')
                ->has('catalog.categories', 8)
                ->has('catalog.cellarTypes', 4),
            );
    }

    public function test_members_do_not_see_prices_when_the_household_hides_them(): void
    {
        [, $household, $cellar] = $this->userWithCellar();
        $household->update(['share_prices' => false]);
        $member = $this->joinHousehold($household);

        $this->wineIn($this->compartment($cellar), ['quantity' => 2, 'price_cents' => 5000]);

        $this->actingAs($member)
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('stats.valueCents', null)
                ->where('household.canSeePrices', false),
            );
    }
}
