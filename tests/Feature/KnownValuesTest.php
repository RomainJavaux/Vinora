<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * The wine form suggests what the household already typed.
 */
class KnownValuesTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_form_suggests_values_already_typed_most_used_first(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $compartment = $this->compartment($cellar);
        $leflaive = ['producer' => 'Domaine Leflaive', 'region' => 'Bourgogne', 'country' => 'France', 'appellation' => 'Puligny-Montrachet'];

        $this->wineIn($compartment, [...$leflaive, 'bought_from' => 'Cave Nicolas', 'tags' => ['garde'], 'grapes' => ['Chardonnay']]);
        $this->wineIn($compartment, [...$leflaive, 'producer' => 'domaine leflaive ', 'tags' => ['garde', 'fête']]);
        $this->wineIn($compartment, [...$leflaive, 'appellation' => 'Bâtard-Montrachet']);
        $this->wineIn($compartment, ['producer' => 'Château Talbot', 'region' => 'Bordeaux', 'appellation' => 'Saint-Julien', 'grapes' => ['Cabernet Sauvignon', 'Mon cépage']]);

        $this->actingAs($user)
            ->get(route('wines.create'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('known.producers', 2)
                ->where('known.producers.0.value', 'Domaine Leflaive')
                ->where('known.producers.0.count', 3)
                ->where('known.producers.0.region', 'Bourgogne')
                ->where('known.producers.0.country', 'France')
                ->where('known.appellations.0.value', 'Puligny-Montrachet')
                ->where('known.appellations.0.count', 2)
                ->where('known.boughtFrom.0.value', 'Cave Nicolas')
                ->where('known.tags.0.value', 'garde')
                ->where('known.tags.0.count', 2)
                ->where('known.grapes', fn ($grapes) => collect($grapes)->pluck('value')->contains('Mon cépage')),
            );
    }

    public function test_each_household_only_sees_its_own_values(): void
    {
        [$user] = $this->userWithCellar();
        [, , $otherCellar] = $this->userWithCellar();
        $this->wineIn($this->compartment($otherCellar), ['producer' => 'Domaine secret']);

        $this->actingAs($user)
            ->get(route('wines.create'))
            ->assertInertia(fn (Assert $page) => $page->has('known.producers', 0));
    }
}
