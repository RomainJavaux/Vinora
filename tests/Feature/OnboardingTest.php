<?php

namespace Tests\Feature;

use App\Models\Household;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OnboardingTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_onboarding_creates_the_household_and_its_first_cellar(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('onboarding.store'), [
                'household' => ['name' => 'La maison', 'emoji' => '🏡', 'color' => 'gold'],
                'cellar' => [
                    'name' => 'Cave du salon',
                    'type' => 'cabinet',
                    'color' => 'bordeaux',
                    'location' => 'Salon',
                    'compartments' => [
                        ['name' => 'Rouges', 'capacity' => 8],
                        ['name' => 'Blancs', 'capacity' => 6],
                        ['name' => 'Bulles'],
                    ],
                ],
            ])
            ->assertRedirect(route('dashboard'))
            ->assertInertiaFlash('celebrate', true);

        $household = Household::query()->sole();
        $this->assertSame($user->id, $household->owner_id);
        $this->assertSame($household->id, $user->refresh()->current_household_id);
        $this->assertSame('owner', $household->members()->first()?->pivot?->getAttribute('role'));

        $cellar = $household->cellars()->sole();
        $this->assertSame(['Rouges', 'Blancs', 'Bulles'], $cellar->compartments()->pluck('name')->all());
        $this->assertSame([8, 6, 8], $cellar->compartments()->pluck('capacity')->all());
    }

    public function test_the_cellar_step_is_optional(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('onboarding.store'), [
                'household' => ['name' => 'Chez nous', 'emoji' => '🏠', 'color' => 'bordeaux'],
            ])
            ->assertRedirect(route('dashboard'));

        $this->assertSame(0, Household::query()->sole()->cellars()->count());
    }

    public function test_the_household_name_is_required(): void
    {
        $this->actingAs(User::factory()->create())
            ->post(route('onboarding.store'), ['household' => ['name' => '']])
            ->assertSessionHasErrors('household.name');

        $this->assertSame(0, Household::query()->count());
    }

    public function test_users_with_a_household_skip_the_onboarding(): void
    {
        [$user] = $this->userWithCellar();

        $this->actingAs($user)->get(route('onboarding'))->assertRedirect(route('dashboard'));
        $this->actingAs($user)->get(route('onboarding', ['new' => 1]))->assertOk();
    }
}
