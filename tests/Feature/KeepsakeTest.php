<?php

namespace Tests\Feature;

use App\Models\Wine;
use App\Support\DrinkWindow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * « Ne pas boire » : a gift, a souvenir or a collection bottle stays in the
 * cellar but is never suggested.
 */
class KeepsakeTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_bottle_can_be_kept_aside_from_the_form(): void
    {
        [$user, , $cellar] = $this->userWithCellar();

        $this->actingAs($user)->post(route('wines.store'), [
            'name' => 'Château Lafite 1990',
            'category' => 'red',
            'vintage' => 1990,
            'quantity' => 1,
            'format' => 'standard',
            'keepsake' => '1',
            'compartment_id' => $this->compartment($cellar)->id,
        ])->assertSessionHasNoErrors();

        $wine = Wine::query()->sole();
        $this->assertTrue($wine->keepsake);
        $this->assertSame(DrinkWindow::KEEP, $wine->windowStatus());

        $this->actingAs($user)
            ->get(route('wines.show', $wine))
            ->assertInertia(fn (Assert $page) => $page
                ->where('wine.keepsake', true)
                ->where('wine.window.status', 'keep'),
            );

        $this->actingAs($user)->put(route('wines.update', $wine), [
            'name' => $wine->name,
            'category' => 'red',
            'format' => 'standard',
            'keepsake' => '0',
            'compartment_id' => $wine->compartment_id,
        ])->assertSessionHasNoErrors();

        $this->assertFalse($wine->refresh()->keepsake);
    }

    public function test_kept_bottles_are_never_suggested(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $year = now()->year;
        $urgent = ['drink_from' => $year - 6, 'drink_until' => $year, 'quantity' => 2, 'initial_quantity' => 2];

        $drink = $this->wineIn($this->compartment($cellar), ['name' => 'À ouvrir', ...$urgent]);
        $kept = $this->wineIn($this->compartment($cellar), ['name' => 'Souvenir de mariage', 'keepsake' => true, ...$urgent]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('stats.urgent', 2)
                ->where('stats.units', 4)
                ->has('priority', 1)
                ->where('priority.0.id', $drink->id)
                ->has('suggestions', 1)
                ->where('suggestions.0.id', $drink->id)
                ->where('cellars.0.compartments.0.urgentCount', 1),
            );

        $this->assertSame([$drink->id], Wine::query()->urgent()->pluck('id')->all());
        $this->assertNotContains($kept->id, Wine::query()->ready()->pluck('id')->all());
    }

    public function test_the_excel_file_carries_the_choice(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $this->wineIn($this->compartment($cellar), ['name' => 'Souvenir', 'keepsake' => true]);
        $csv = "Nom;Couleur;Ne pas boire\nCadeau de Paul;Rouge;oui\nÀ boire;Blanc;\nBizarre;Rouge;peut-être\n";

        $response = $this->actingAs($user)->post(route('wines.preview'), [
            'file' => UploadedFile::fake()->createWithContent('liste.csv', $csv),
        ]);
        parse_str((string) parse_url((string) $response->headers->get('Location'), PHP_URL_QUERY), $query);
        $token = (string) $query['token'];

        $this->actingAs($user)
            ->get(route('wines.import', ['token' => $token]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('preview.rows.0.action', 'create')
                ->where('preview.rows.1.action', 'create')
                ->where('preview.rows.2.action', 'error'),
            );

        $this->actingAs($user)->post(route('wines.confirm', $token));

        $this->assertTrue(Wine::query()->where('name', 'Cadeau de Paul')->sole()->keepsake);
        $this->assertFalse(Wine::query()->where('name', 'À boire')->sole()->keepsake);
    }
}
