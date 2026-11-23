<?php

namespace Tests\Feature;

use App\Enums\MovementType;
use App\Models\Wine;
use App\Services\PhotoStore;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery\MockInterface;
use RuntimeException;
use Tests\TestCase;

/**
 * Adding a wine that is already in stock: the bottles can join that lot.
 */
class DuplicateWineTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, mixed>
     */
    private function talbot(int $compartmentId, array $extra = []): array
    {
        return [
            'name' => 'Château Talbot',
            'producer' => '',
            'category' => 'red',
            'vintage' => 2016,
            'quantity' => 2,
            'format' => 'standard',
            'compartment_id' => $compartmentId,
            ...$extra,
        ];
    }

    public function test_the_form_knows_the_lots_in_stock(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $lot = $this->wineIn($this->compartment($cellar, 1), ['name' => 'Château Talbot', 'vintage' => 2016, 'quantity' => 4]);
        $this->wineIn($this->compartment($cellar), ['name' => 'Bu', 'quantity' => 0, 'finished_at' => now()]);

        $this->actingAs($user)
            ->get(route('wines.create'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('stock', 1)
                ->where('stock.0.id', $lot->id)
                ->where('stock.0.quantity', 4)
                ->where('stock.0.place', 'Cave du salon › '.$this->compartment($cellar, 1)->name),
            );
    }

    public function test_new_bottles_join_the_lot_already_in_stock(): void
    {
        Storage::fake('public');
        [$user, , $cellar] = $this->userWithCellar();
        $lot = $this->wineIn($this->compartment($cellar, 1), ['name' => 'Château Talbot', 'producer' => null, 'vintage' => 2016, 'quantity' => 4, 'initial_quantity' => 4]);

        $this->actingAs($user)
            ->post(route('wines.store'), $this->talbot($lot->compartment_id ?? 0, [
                'name' => ' château talbot ',
                'merge_into' => $lot->id,
                'photo' => UploadedFile::fake()->image('etiquette.jpg', 800, 1000),
            ]))
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('cellars.show', ['cellar' => $cellar->id, 'compartment' => $lot->compartment_id, 'item' => $lot->id]))
            ->assertInertiaFlash('toast.message', 'Château Talbot 2016 : +2, soit 6 bouteilles dans '.$this->compartment($cellar, 1)->name.' 🍷');

        $this->assertSame(1, Wine::query()->count());
        $lot->refresh();
        $this->assertSame(6, $lot->quantity);
        $this->assertSame(6, $lot->initial_quantity);
        $this->assertNotNull($lot->photo_path);
        $this->assertTrue($lot->movements()->where('type', MovementType::Restocked)->where('quantity', 2)->exists());
    }

    public function test_bottles_only_join_the_same_wine_of_the_same_place(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $lot = $this->wineIn($this->compartment($cellar), ['name' => 'Château Talbot', 'vintage' => 2016, 'quantity' => 4]);
        [, , $otherCellar] = $this->userWithCellar();
        $foreign = $this->wineIn($this->compartment($otherCellar), ['name' => 'Château Talbot', 'vintage' => 2016, 'quantity' => 4]);
        $compartmentId = $this->compartment($cellar)->id;

        $this->actingAs($user)
            ->post(route('wines.store'), $this->talbot($compartmentId, ['vintage' => 2017, 'merge_into' => $lot->id]))
            ->assertSessionHasErrors('merge_into');

        $this->actingAs($user)
            ->post(route('wines.store'), $this->talbot($compartmentId, ['merge_into' => $foreign->id]))
            ->assertSessionHasErrors('merge_into');

        $this->assertSame(4, $lot->refresh()->quantity);
        $this->assertSame(4, $foreign->refresh()->quantity);
        $this->assertSame(2, Wine::query()->count());
    }

    public function test_a_lot_that_lost_its_place_gets_the_one_chosen(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $lot = $this->wineIn($this->compartment($cellar), ['name' => 'Château Talbot', 'producer' => null, 'vintage' => 2016, 'quantity' => 4]);
        $lot->forceFill(['compartment_id' => null])->save();
        $chosen = $this->compartment($cellar, 2);

        $this->actingAs($user)
            ->post(route('wines.store'), $this->talbot($chosen->id, ['merge_into' => $lot->id]))
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('cellars.show', ['cellar' => $cellar->id, 'compartment' => $chosen->id, 'item' => $lot->id]));

        $lot->refresh();
        $this->assertSame(6, $lot->quantity);
        $this->assertSame($chosen->id, $lot->compartment_id);
    }

    public function test_a_gift_never_joins_bottles_meant_to_be_drunk(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $lot = $this->wineIn($this->compartment($cellar), ['name' => 'Château Talbot', 'producer' => null, 'vintage' => 2016, 'quantity' => 4]);

        $this->actingAs($user)
            ->post(route('wines.store'), $this->talbot($lot->compartment_id ?? 0, ['merge_into' => $lot->id, 'keepsake' => '1']))
            ->assertSessionHasErrors('merge_into');

        $this->assertSame(4, $lot->refresh()->quantity);
        $this->assertFalse($lot->keepsake);
    }

    public function test_merging_completes_what_the_lot_did_not_know(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $lot = $this->wineIn($this->compartment($cellar), [
            'name' => 'Château Talbot', 'producer' => null, 'vintage' => 2016, 'quantity' => 4,
            'appellation' => null, 'region' => 'Bordeaux', 'grapes' => [], 'price_cents' => null,
        ]);

        $this->actingAs($user)
            ->post(route('wines.store'), $this->talbot($lot->compartment_id ?? 0, [
                'merge_into' => $lot->id,
                'appellation' => 'Saint-Julien',
                'region' => 'Médoc',
                'grapes' => ['Cabernet Sauvignon', 'Merlot'],
                'price' => '42,50',
            ]))
            ->assertSessionHasNoErrors();

        $lot->refresh();
        $this->assertSame('Saint-Julien', $lot->appellation);
        $this->assertSame('Bordeaux', $lot->region, 'What the lot already knew is kept.');
        $this->assertSame(['Cabernet Sauvignon', 'Merlot'], $lot->grapes);
        $this->assertSame(4250, $lot->price_cents);
        $this->assertSame(0, $lot->movements()->where('type', MovementType::Updated)->count());
    }

    public function test_a_split_is_kept_when_merging(): void
    {
        Storage::fake('public');
        [$user, , $cellar] = $this->userWithCellar();
        [$first, $second, $third] = $cellar->compartments->all();
        $lot = $this->wineIn($first, ['name' => 'Château Talbot', 'producer' => null, 'vintage' => 2016, 'quantity' => 4]);
        // A gift of the same wine, stored there first, is left alone.
        $gift = $this->wineIn($third, ['name' => 'Château Talbot', 'producer' => null, 'vintage' => 2016, 'quantity' => 1, 'keepsake' => true]);
        $twin = $this->wineIn($third, ['name' => 'Château Talbot', 'producer' => null, 'vintage' => 2016, 'quantity' => 1]);

        $this->actingAs($user)
            ->post(route('wines.store'), $this->talbot($first->id, [
                'quantity' => 6,
                'merge_into' => $lot->id,
                'photo' => UploadedFile::fake()->image('etiquette.jpg'),
                'placements' => [
                    ['compartment_id' => $second->id, 'quantity' => 2],
                    ['compartment_id' => $third->id, 'quantity' => 1],
                ],
            ]))
            ->assertSessionHasNoErrors();

        $this->assertSame(7, $lot->refresh()->quantity);
        $this->assertSame(2, $twin->refresh()->quantity, 'The bottles for a place holding the same wine join it.');
        $this->assertSame(1, $gift->refresh()->quantity);
        $this->assertSame(2, Wine::query()->where('compartment_id', $third->id)->count());
        $this->assertSame(2, Wine::query()->where('compartment_id', $second->id)->sole()->quantity);
        $this->assertNotNull($twin->photo_path, 'The twin gets its own copy of the label photo.');
        $this->assertNotSame($lot->photo_path, $twin->photo_path);
        Storage::disk('public')->assertExists([(string) $lot->photo_path, (string) $twin->photo_path]);
    }

    public function test_a_lot_without_a_drinking_window_takes_the_one_given(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $compartment = $this->compartment($cellar);
        $lot = $this->wineIn($compartment, [
            'name' => 'Château Talbot', 'producer' => null, 'vintage' => 2016, 'quantity' => 4,
            'aging' => null, 'drink_from' => null, 'drink_until' => null,
        ]);
        $dated = $this->wineIn($this->compartment($cellar, 1), [
            'name' => 'Château Talbot', 'producer' => null, 'vintage' => 2016, 'quantity' => 2, 'format' => 'magnum',
            'drink_from' => 2020, 'drink_until' => 2024,
        ]);

        $this->actingAs($user)
            ->post(route('wines.store'), $this->talbot($compartment->id, [
                'merge_into' => $lot->id, 'aging' => 'long', 'drink_from' => 2026, 'drink_until' => 2040,
            ]))
            ->assertSessionHasNoErrors();

        $lot->refresh();
        $this->assertSame('long', $lot->aging?->value);
        $this->assertSame([2026, 2040], [$lot->drink_from, $lot->drink_until]);

        $this->actingAs($user)
            ->post(route('wines.store'), $this->talbot($compartment->id, [
                'format' => 'magnum', 'merge_into' => $dated->id, 'drink_from' => 2030, 'drink_until' => 2045,
            ]))
            ->assertSessionHasNoErrors();

        $dated->refresh();
        $this->assertSame([2020, 2024], [$dated->drink_from, $dated->drink_until], 'A window of its own is kept.');
        $this->assertSame(4, $dated->quantity);
    }

    public function test_a_photo_that_cannot_be_stored_leaves_the_stock_untouched(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $lot = $this->wineIn($this->compartment($cellar), ['name' => 'Château Talbot', 'producer' => null, 'vintage' => 2016, 'quantity' => 4]);
        $this->mock(PhotoStore::class, fn (MockInterface $mock) => $mock->shouldReceive('store')->andThrow(new RuntimeException('Image illisible')));

        $this->actingAs($user)
            ->post(route('wines.store'), $this->talbot($lot->compartment_id ?? 0, [
                'merge_into' => $lot->id,
                'photo' => UploadedFile::fake()->image('etiquette.jpg'),
            ]))
            ->assertServerError();

        $this->assertSame(4, $lot->refresh()->quantity);
        $this->assertSame(0, $lot->movements()->count());
    }

    public function test_without_merging_the_bottles_get_their_own_lot(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $lot = $this->wineIn($this->compartment($cellar), ['name' => 'Château Talbot', 'vintage' => 2016, 'quantity' => 4]);

        $this->actingAs($user)
            ->post(route('wines.store'), $this->talbot($this->compartment($cellar, 2)->id))
            ->assertSessionHasNoErrors();

        $this->assertSame(2, Wine::query()->where('name', 'Château Talbot')->count());
        $this->assertSame(4, $lot->refresh()->quantity);
    }
}
