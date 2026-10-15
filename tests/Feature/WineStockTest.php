<?php

namespace Tests\Feature;

use App\Enums\MovementType;
use App\Models\Wine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WineStockTest extends TestCase
{
    use RefreshDatabase;

    public function test_drinking_takes_bottles_out_and_keeps_the_tasting(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $wine = $this->wineIn($this->compartment($cellar), ['quantity' => 3, 'initial_quantity' => 3]);

        $this->actingAs($user)->post(route('wines.drink', $wine), ['quantity' => 2, 'rating' => 4, 'note' => 'Superbe'])->assertRedirect();

        $wine->refresh();
        $this->assertSame(1, $wine->quantity);
        $this->assertNull($wine->finished_at);
        $this->assertSame(4.0, $wine->rating);

        $movement = $wine->movements()->sole();
        $this->assertSame(MovementType::Drunk, $movement->type);
        $this->assertSame(2, $movement->quantity);
        $this->assertSame(4, $movement->rating);
        $this->assertSame('Superbe', $movement->note);
    }

    public function test_the_last_bottle_finishes_the_lot_and_ratings_are_averaged(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $wine = $this->wineIn($this->compartment($cellar), ['quantity' => 2, 'initial_quantity' => 2]);

        $this->actingAs($user)->post(route('wines.drink', $wine), ['quantity' => 1, 'rating' => 5]);
        $this->actingAs($user)->post(route('wines.drink', $wine), ['quantity' => 1, 'rating' => 4]);

        $wine->refresh();
        $this->assertSame(0, $wine->quantity);
        $this->assertNotNull($wine->finished_at);
        $this->assertSame(4.5, $wine->rating);
    }

    public function test_one_cannot_drink_more_than_what_is_left(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $wine = $this->wineIn($this->compartment($cellar), ['quantity' => 2]);

        $this->actingAs($user)->post(route('wines.drink', $wine), ['quantity' => 3])->assertSessionHasErrors('quantity');
        $this->actingAs($user)->post(route('wines.drink', $wine), ['quantity' => 1, 'rating' => 6])->assertSessionHasErrors('rating');

        $this->assertSame(2, $wine->refresh()->quantity);
    }

    public function test_bottles_can_be_given_away(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $wine = $this->wineIn($this->compartment($cellar), ['quantity' => 2]);

        $this->actingAs($user)->post(route('wines.gift', $wine), ['quantity' => 1, 'recipient' => 'Paul'])->assertRedirect();

        $this->assertSame(1, $wine->refresh()->quantity);
        $this->assertDatabaseHas('wine_movements', ['wine_id' => $wine->id, 'type' => 'gifted', 'note' => 'Paul', 'quantity' => 1]);
    }

    public function test_restocking_reactivates_a_finished_lot(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $wine = $this->wineIn($this->compartment($cellar), ['quantity' => 0, 'initial_quantity' => 6, 'finished_at' => now()]);

        $this->actingAs($user)->post(route('wines.restock', $wine), ['quantity' => 12])->assertRedirect();

        $wine->refresh();
        $this->assertSame(12, $wine->quantity);
        $this->assertSame(12, $wine->initial_quantity);
        $this->assertNull($wine->finished_at);
        $this->assertDatabaseHas('wine_movements', ['wine_id' => $wine->id, 'type' => 'restocked', 'quantity' => 12]);
    }

    public function test_moving_the_whole_lot(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        [$from, $to] = $cellar->compartments->all();
        $wine = $this->wineIn($from, ['quantity' => 3]);

        $this->actingAs($user)->post(route('wines.move', $wine), ['compartment_id' => $to->id])->assertRedirect();

        $this->assertSame($to->id, $wine->refresh()->compartment_id);
        $this->assertDatabaseHas('wine_movements', [
            'wine_id' => $wine->id,
            'type' => 'moved',
            'from_compartment_id' => $from->id,
            'to_compartment_id' => $to->id,
            'quantity' => 3,
        ]);
    }

    public function test_moving_some_bottles_splits_the_lot(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        [$from, $to] = $cellar->compartments->all();
        $wine = $this->wineIn($from, ['quantity' => 6, 'initial_quantity' => 6]);

        $this->actingAs($user)->post(route('wines.move', $wine), ['compartment_id' => $to->id, 'quantity' => 2])->assertRedirect();

        $this->assertSame(4, $wine->refresh()->quantity);
        $this->assertSame($from->id, $wine->compartment_id);

        $split = Wine::query()->whereKeyNot($wine->id)->sole();
        $this->assertSame($to->id, $split->compartment_id);
        $this->assertSame(2, $split->quantity);
        $this->assertSame($wine->name, $split->name);
        $this->assertSame($wine->vintage, $split->vintage);
    }

    public function test_moved_bottles_join_an_identical_lot(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        [$from, $to] = $cellar->compartments->all();
        $wine = $this->wineIn($from, ['name' => 'Morgon', 'vintage' => 2022, 'quantity' => 6]);
        $twin = $this->wineIn($to, ['name' => 'Morgon', 'vintage' => 2022, 'quantity' => 1, 'initial_quantity' => 1]);
        $this->wineIn($to, ['name' => 'Morgon', 'vintage' => 2021, 'quantity' => 1]);

        $this->actingAs($user)->post(route('wines.move', $wine), ['compartment_id' => $to->id, 'quantity' => 3]);

        $this->assertSame(3, $wine->refresh()->quantity);
        $this->assertSame(4, $twin->refresh()->quantity);
        $this->assertSame(3, Wine::query()->count());
    }

    public function test_corked_bottles_are_discarded(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $wine = $this->wineIn($this->compartment($cellar), ['quantity' => 2]);

        $this->actingAs($user)->post(route('wines.discard', $wine), ['reason' => 'corked'])->assertRedirect();

        $wine->refresh();
        $this->assertSame(0, $wine->quantity);
        $this->assertNotNull($wine->finished_at);
        $this->assertDatabaseHas('wine_movements', ['wine_id' => $wine->id, 'type' => 'discarded', 'quantity' => 2, 'note' => 'Bouchonné']);
    }

    public function test_editing_a_wine_logs_the_change_and_the_move(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        [$from, $to] = $cellar->compartments->all();
        $wine = $this->wineIn($from, ['quantity' => 2, 'initial_quantity' => 2]);

        $this->actingAs($user)->put(route('wines.update', $wine), [
            'name' => 'Nouveau nom',
            'category' => 'white',
            'vintage' => 2020,
            'quantity' => 5,
            'format' => 'magnum',
            'drink_from' => 2022,
            'drink_until' => 2030,
            'compartment_id' => $to->id,
        ])->assertRedirect(route('wines.show', $wine));

        $wine->refresh();
        $this->assertSame('Nouveau nom', $wine->name);
        $this->assertSame(5, $wine->initial_quantity);
        $this->assertSame($to->id, $wine->compartment_id);
        $this->assertSame(['moved', 'updated'], $wine->movements()->pluck('type')->map->value->sort()->values()->all());
    }
}
