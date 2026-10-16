<?php

namespace Tests\Feature;

use App\Enums\MovementType;
use App\Models\Wine;
use App\Models\WineMovement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class WineTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_wine_can_be_stored_with_its_label_photo(): void
    {
        Storage::fake('public');
        [$user, $household, $cellar] = $this->userWithCellar();
        $compartment = $this->compartment($cellar, 1);

        $response = $this->actingAs($user)->post(route('wines.store'), [
            'name' => 'Château Talbot',
            'producer' => '',
            'category' => 'red',
            'vintage' => 2016,
            'appellation' => 'Saint-Julien',
            'region' => 'Bordeaux',
            'country' => 'France',
            'grapes' => ['Merlot', ' merlot', 'Cabernet Sauvignon'],
            'quantity' => 6,
            'format' => 'standard',
            'price' => '42,50',
            'aging' => 'long',
            'tags' => ['#Garde', 'garde ', 'Fête'],
            'photo' => UploadedFile::fake()->image('etiquette.jpg', 2400, 1800),
            'compartment_id' => $compartment->id,
        ]);

        $wine = Wine::query()->sole();

        $response->assertRedirect(route('cellars.show', [
            'cellar' => $cellar->id,
            'compartment' => $compartment->id,
            'item' => $wine->id,
        ]));
        $response->assertInertiaFlash('celebrate', true);

        $this->assertSame($household->id, $wine->household_id);
        $this->assertSame($user->id, $wine->created_by);
        $this->assertSame(6, $wine->initial_quantity);
        $this->assertSame(4250, $wine->price_cents);
        $this->assertSame(['garde', 'fête'], $wine->tags);
        $this->assertSame(['Merlot', 'Cabernet Sauvignon'], $wine->grapes);
        $this->assertSame([2022, 2031], [$wine->drink_from, $wine->drink_until]);
        $this->assertNotNull($wine->photo_path);
        $this->assertStringEndsWith('.webp', (string) $wine->photo_path);
        Storage::disk('public')->assertExists((string) $wine->photo_path);

        $movement = $wine->movements()->sole();
        $this->assertSame(MovementType::Added, $movement->type);
        $this->assertSame(6, $movement->quantity);
        $this->assertSame($compartment->id, $movement->to_compartment_id);
        $this->assertSame(2016, $movement->wine_vintage);
    }

    public function test_bottles_can_be_spread_over_several_places(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        [$first, $second, $third] = $cellar->compartments->all();

        $this->actingAs($user)->post(route('wines.store'), [
            'name' => 'Pinot Gris Les Princes Abbés',
            'producer' => 'Domaines Schlumberger',
            'category' => 'white',
            'vintage' => 2022,
            'quantity' => 12,
            'format' => 'standard',
            'compartment_id' => $first->id,
            'placements' => [
                ['compartment_id' => $second->id, 'quantity' => 5],
                ['compartment_id' => $third->id, 'quantity' => 2],
            ],
        ])->assertRedirect()->assertInertiaFlash('toast.message', 'Pinot Gris Les Princes Abbés 2022 rangé dans Clayette 1, Clayette 2 et Clayette 3 🍷');

        $lots = Wine::query()->orderBy('id')->get();
        $this->assertSame([5, 5, 2], $lots->pluck('quantity')->all());
        $this->assertSame([$first->id, $second->id, $third->id], $lots->pluck('compartment_id')->all());
        $this->assertSame(1, $lots->pluck('name')->unique()->count());
        $this->assertSame(3, WineMovement::query()->where('type', 'added')->count());
    }

    public function test_at_least_one_bottle_stays_in_the_main_place(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        [$first, $second] = $cellar->compartments->all();

        $this->actingAs($user)->post(route('wines.store'), [
            'name' => 'Riesling',
            'category' => 'white',
            'quantity' => 3,
            'format' => 'standard',
            'compartment_id' => $first->id,
            'placements' => [['compartment_id' => $second->id, 'quantity' => 3]],
        ])->assertSessionHasErrors('placements');

        $this->assertSame(0, Wine::query()->count());
    }

    public function test_the_compartment_must_belong_to_the_household(): void
    {
        [$user] = $this->userWithCellar();
        [, , $foreign] = $this->userWithCellar();

        $this->actingAs($user)->post(route('wines.store'), [
            'name' => 'Intrus',
            'category' => 'red',
            'quantity' => 1,
            'format' => 'standard',
            'compartment_id' => $this->compartment($foreign)->id,
        ])->assertSessionHasErrors('compartment_id');

        $this->assertSame(0, Wine::query()->count());
    }

    public function test_the_window_cannot_end_before_it_starts(): void
    {
        [$user, , $cellar] = $this->userWithCellar();

        $this->actingAs($user)->post(route('wines.store'), [
            'name' => 'Vin pressé',
            'category' => 'red',
            'quantity' => 1,
            'format' => 'standard',
            'drink_from' => 2030,
            'drink_until' => 2025,
            'compartment_id' => $this->compartment($cellar)->id,
        ])->assertSessionHasErrors('drink_until');
    }

    public function test_the_inventory_lists_the_stock_and_the_finished_wines(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $inStock = $this->wineIn($this->compartment($cellar), ['quantity' => 3]);
        $this->wineIn($this->compartment($cellar), ['quantity' => 0, 'finished_at' => now()]);

        [, , $other] = $this->userWithCellar();
        $this->wineIn($this->compartment($other));

        $this->actingAs($user)
            ->get(route('wines.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('wines/index')
                ->has('items', 1)
                ->where('items.0.id', $inStock->id)
                ->where('items.0.location.cellarName', 'Cave du salon')
                ->has('finished', 1),
            );
    }

    public function test_wines_of_other_households_are_forbidden(): void
    {
        [$user] = $this->userWithCellar();
        [, , $foreign] = $this->userWithCellar();
        $wine = $this->wineIn($this->compartment($foreign));

        $this->actingAs($user)->get(route('wines.show', $wine))->assertForbidden();
        $this->actingAs($user)->post(route('wines.drink', $wine), ['quantity' => 1])->assertForbidden();
        $this->actingAs($user)->delete(route('wines.destroy', $wine))->assertForbidden();
    }

    public function test_opening_a_wine_of_another_household_switches_to_it(): void
    {
        [$user, $first] = $this->userWithCellar();
        [, $second, $secondCellar] = $this->userWithCellar();
        $this->joinHousehold($second, user: $user);
        $user->switchHousehold($first);

        $wine = $this->wineIn($this->compartment($secondCellar));

        $this->actingAs($user)
            ->get(route('wines.show', $wine))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('household.id', $second->id));

        $this->assertSame($second->id, $user->refresh()->current_household_id);
    }

    public function test_the_wine_page_lists_the_same_wine_elsewhere_and_its_tastings(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $wine = $this->wineIn($this->compartment($cellar), ['name' => 'Morgon', 'vintage' => 2022, 'quantity' => 4]);
        $this->wineIn($this->compartment($cellar, 2), ['name' => 'Morgon', 'vintage' => 2023, 'quantity' => 2]);

        $this->actingAs($user)->post(route('wines.drink', $wine), ['quantity' => 1, 'rating' => 5, 'note' => 'Croquant !']);

        $this->actingAs($user)
            ->get(route('wines.show', $wine))
            ->assertInertia(fn (Assert $page) => $page
                ->component('wines/show')
                ->has('siblings', 1)
                ->where('siblings.0.vintage', 2023)
                ->has('tastings', 1)
                ->where('tastings.0.rating', 5)
                ->where('wine.rating', 5),
            );
    }

    public function test_members_cannot_see_prices_when_they_are_hidden(): void
    {
        [, $household, $cellar] = $this->userWithCellar();
        $household->update(['share_prices' => false]);
        $member = $this->joinHousehold($household);
        $wine = $this->wineIn($this->compartment($cellar), ['price_cents' => 9900]);

        $this->actingAs($member)
            ->get(route('wines.show', $wine))
            ->assertInertia(fn (Assert $page) => $page->where('wine.priceCents', null));
    }

    public function test_buying_again_copies_the_photo_of_the_original(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('wines/1/original.webp', 'image');
        [$user, , $cellar] = $this->userWithCellar();
        $source = $this->wineIn($this->compartment($cellar), ['photo_path' => 'wines/1/original.webp', 'quantity' => 0, 'finished_at' => now()]);

        $this->actingAs($user)->post(route('wines.store'), [
            'from' => $source->id,
            'name' => $source->name,
            'category' => 'red',
            'quantity' => 6,
            'format' => 'standard',
            'compartment_id' => $source->compartment_id,
        ])->assertRedirect();

        $copy = Wine::query()->whereKeyNot($source->id)->sole();
        $this->assertNotNull($copy->photo_path);
        $this->assertNotSame($source->photo_path, $copy->photo_path);
        Storage::disk('public')->assertExists((string) $copy->photo_path);
    }

    public function test_deleting_a_wine_keeps_its_history(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $wine = $this->wineIn($this->compartment($cellar), ['quantity' => 2]);
        $this->actingAs($user)->post(route('wines.drink', $wine), ['quantity' => 1]);

        $this->actingAs($user)->delete(route('wines.destroy', $wine))->assertRedirect(route('wines.index'));

        $this->assertNull($wine->fresh());
        $this->assertDatabaseHas('wine_movements', ['wine_id' => null, 'wine_name' => $wine->name, 'type' => 'drunk']);
    }
}
