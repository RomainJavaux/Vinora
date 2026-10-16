<?php

namespace Tests\Feature;

use App\Models\Cellar;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CellarTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_cellar_can_be_created_with_its_compartments(): void
    {
        [$user, $household] = $this->userWithCellar();

        $response = $this->actingAs($user)->post(route('cellars.store'), [
            'name' => 'Cave voûtée',
            'type' => 'vault',
            'color' => 'oak',
            'location' => 'Sous-sol',
            'temperature' => '13',
            'humidity' => 75,
            'compartments' => [
                ['name' => 'Bordeaux', 'capacity' => 24],
                ['name' => 'Bourgogne'],
            ],
        ]);

        $cellar = Cellar::query()->where('name', 'Cave voûtée')->sole();
        $response->assertRedirect(route('cellars.show', $cellar));

        $this->assertSame($household->id, $cellar->household_id);
        $this->assertSame(13.0, $cellar->temperature);
        $this->assertSame([24, 24], $cellar->compartments()->pluck('capacity')->all());
        $this->assertSame(2, $cellar->position);
    }

    public function test_saving_synchronises_the_compartments(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        [$first, $second, $third] = $cellar->compartments->all();

        $wine = $this->wineIn($third);

        $this->actingAs($user)->put(route('cellars.update', $cellar), [
            'name' => 'Cave du salon',
            'type' => 'cabinet',
            'color' => 'bordeaux',
            'compartments' => [
                ['id' => $second->id, 'name' => 'Rouges'],
                ['id' => $first->id, 'name' => 'Blancs', 'capacity' => 10],
                ['name' => 'Bulles'],
            ],
        ])->assertRedirect(route('cellars.show', $cellar));

        $compartments = $cellar->compartments()->get();

        $this->assertSame(['Rouges', 'Blancs', 'Bulles'], $compartments->pluck('name')->all());
        $this->assertSame($second->id, $compartments[0]->id);
        $this->assertSame(10, $compartments[1]->capacity);
        $this->assertNull($third->fresh());
        $this->assertSame($second->id, $wine->refresh()->compartment_id);
    }

    public function test_rows_in_depth_multiply_the_capacity(): void
    {
        [$user, , $cellar] = $this->userWithCellar();

        $this->actingAs($user)->put(route('cellars.update', $cellar), [
            'name' => 'Cave du salon',
            'type' => 'cabinet',
            'color' => 'bordeaux',
            'depth' => 2,
            'compartments' => $cellar->compartments->map(fn ($compartment) => [
                'id' => $compartment->id,
                'name' => $compartment->name,
                'capacity' => 20,
            ])->all(),
        ])->assertRedirect();

        $this->assertSame(2, $cellar->refresh()->depth);

        $this->actingAs($user)
            ->get(route('cellars.show', $cellar))
            ->assertInertia(fn (Assert $page) => $page
                ->where('cellar.depth', 2)
                ->where('cellar.compartments.0.frontCapacity', 20)
                ->where('cellar.compartments.0.capacity', 40)
                ->where('cellar.stats.capacity', 120),
            );
    }

    public function test_a_vault_has_no_depth(): void
    {
        [$user] = $this->userWithCellar();

        $this->actingAs($user)->post(route('cellars.store'), [
            'name' => 'Cave voûtée',
            'type' => 'vault',
            'color' => 'oak',
            'depth' => 3,
            'compartments' => [['name' => 'Casier 1']],
        ])->assertSessionHasErrors('depth');
    }

    public function test_the_number_of_compartments_is_limited_by_the_type(): void
    {
        [$user] = $this->userWithCellar();

        $this->actingAs($user)->post(route('cellars.store'), [
            'name' => 'Petite cave',
            'type' => 'service',
            'color' => 'gold',
            'compartments' => array_map(fn (int $i) => ['name' => "Clayette {$i}"], range(1, 7)),
        ])->assertSessionHasErrors('compartments');
    }

    public function test_the_cellar_page_shows_the_bottles_of_each_compartment(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $wine = $this->wineIn($this->compartment($cellar), ['quantity' => 3]);

        $this->actingAs($user)
            ->get(route('cellars.show', ['cellar' => $cellar, 'compartment' => $wine->compartment_id, 'item' => $wine->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('cellars/show')
                ->where('cellar.stats.units', 3)
                ->where('cellar.compartments.0.itemsCount', 1)
                ->has('cellar.compartments.0.previewBottles', 3)
                ->where('cellar.compartments.0.items.0.id', $wine->id)
                ->where('focus.item', $wine->id),
            );
    }

    public function test_deleting_a_cellar_keeps_its_wines_to_be_stored(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $wine = $this->wineIn($this->compartment($cellar));

        $this->actingAs($user)->delete(route('cellars.destroy', $cellar))->assertRedirect(route('cellars.index'));

        $this->assertNull($cellar->fresh());
        $this->assertNotNull($wine->fresh());
        $this->assertNull($wine->refresh()->compartment_id);
    }

    public function test_cellars_of_other_households_are_forbidden(): void
    {
        [$user] = $this->userWithCellar();
        [, , $foreign] = $this->userWithCellar();

        $this->actingAs($user)->get(route('cellars.show', $foreign))->assertForbidden();
        $this->actingAs($user)->delete(route('cellars.destroy', $foreign))->assertForbidden();
    }
}
