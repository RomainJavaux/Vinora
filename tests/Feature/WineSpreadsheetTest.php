<?php

namespace Tests\Feature;

use App\Enums\AgingPotential;
use App\Enums\BottleFormat;
use App\Enums\MovementType;
use App\Enums\WineCategory;
use App\Models\User;
use App\Models\Wine;
use App\Models\WineMovement;
use App\Support\WineSheet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

class WineSpreadsheetTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_wine_is_exported_with_all_its_data(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $compartment = $this->compartment($cellar, 1);
        $wine = $this->wineIn($compartment, [
            'name' => 'Château Talbot',
            'producer' => 'Famille Bignon',
            'vintage' => 2016,
            'appellation' => 'Saint-Julien',
            'grapes' => ['Cabernet Sauvignon', 'Merlot'],
            'alcohol' => 13.5,
            'quantity' => 4,
            'initial_quantity' => 6,
            'format' => BottleFormat::Magnum,
            'price_cents' => 4250,
            'value_cents' => 6000,
            'purchased_on' => '2024-03-12',
            'bought_from' => 'Caviste du coin',
            'aging' => AgingPotential::Long,
            'drink_from' => 2022,
            'drink_until' => 2031,
            'tags' => ['garde', 'fête'],
            'description' => "Notes de cassis.\nÀ carafer.",
            'created_by' => $user->id,
        ]);
        $this->wineIn($compartment, ['name' => 'Beaujolais Nouveau', 'quantity' => 0, 'finished_at' => now()]);
        WineMovement::query()->create([
            'household_id' => $wine->household_id,
            'wine_id' => $wine->id,
            'user_id' => $user->id,
            'type' => MovementType::Drunk,
            'wine_name' => $wine->name,
            'wine_vintage' => 2016,
            'wine_category' => WineCategory::Red,
            'quantity' => 2,
            'rating' => 5,
            'note' => 'Superbe',
            'created_at' => now(),
        ]);

        $response = $this->actingAs($user)->get(route('wines.export'));

        $response->assertOk();
        $this->assertStringContainsString('spreadsheetml', (string) $response->headers->get('Content-Type'));
        $this->assertStringContainsString('vinora-la-maison-', (string) $response->headers->get('Content-Disposition'));

        $spreadsheet = $this->load($response);
        $this->assertSame([WineSheet::SHEET, WineSheet::LISTS_SHEET, WineSheet::HISTORY_SHEET, WineSheet::HELP_SHEET], $spreadsheet->getSheetNames());

        $sheet = $spreadsheet->getSheetByName(WineSheet::SHEET);
        $this->assertNotNull($sheet);
        $row = $this->rowOf($sheet, 'Château Talbot');

        $this->assertSame($wine->id, $this->value($sheet, 'ID', $row));
        $this->assertSame('Famille Bignon', $this->value($sheet, 'Domaine', $row));
        $this->assertSame('Rouge', $this->value($sheet, 'Couleur', $row));
        $this->assertSame(2016, $this->value($sheet, 'Millésime', $row));
        $this->assertSame('Cabernet Sauvignon, Merlot', $this->value($sheet, 'Cépages', $row));
        $this->assertSame(13.5, $this->value($sheet, 'Degré (%)', $row));
        $this->assertSame('Magnum', $this->value($sheet, 'Format', $row));
        $this->assertSame(4, $this->value($sheet, 'Quantité', $row));
        $this->assertSame('Cave du salon', $this->value($sheet, 'Cave', $row));
        $this->assertSame($compartment->name, $this->value($sheet, 'Clayette', $row));
        $this->assertEquals(42.5, $this->value($sheet, 'Prix d’achat (€)', $row));
        $this->assertEquals(60, $this->value($sheet, 'Valeur estimée (€)', $row));
        $this->assertSame('12/03/2024', $sheet->getCell([$this->column($sheet, 'Date d’achat'), $row])->getFormattedValue());
        $this->assertSame('Longue garde', $this->value($sheet, 'Potentiel de garde', $row));
        $this->assertSame(2031, $this->value($sheet, 'À boire jusqu’en', $row));
        $this->assertSame('garde, fête', $this->value($sheet, 'Étiquettes', $row));
        $this->assertSame("Notes de cassis.\nÀ carafer.", $this->value($sheet, 'Notes', $row));
        $this->assertSame(6, $this->value($sheet, 'Quantité achetée', $row));
        $this->assertSame('En cave', $this->value($sheet, 'Statut', $row));
        $this->assertSame($user->name, $this->value($sheet, 'Rangée par', $row));
        $this->assertSame('Terminée', $this->value($sheet, 'Statut', $this->rowOf($sheet, 'Beaujolais Nouveau')));

        $validation = $sheet->getCell([$this->column($sheet, 'Couleur'), 2])->getDataValidation();
        $this->assertSame('list', $validation->getType());
        $this->assertStringContainsString(WineSheet::LISTS_SHEET, $validation->getFormula1());

        $history = $spreadsheet->getSheetByName(WineSheet::HISTORY_SHEET);
        $this->assertNotNull($history);
        $this->assertSame('Bu', $history->getCell('B2')->getValue());
        $this->assertSame('Superbe', $history->getCell('K2')->getValue());
    }

    public function test_prices_stay_out_of_the_export_when_they_are_hidden(): void
    {
        [, $household, $cellar] = $this->userWithCellar();
        $household->update(['share_prices' => false]);
        $member = $this->joinHousehold($household);
        $this->wineIn($this->compartment($cellar), ['price_cents' => 9900]);

        $sheet = $this->load($this->actingAs($member)->get(route('wines.export')))->getSheetByName(WineSheet::SHEET);

        $this->assertNotNull($sheet);
        $this->assertNull($this->findColumn($sheet, 'Prix d’achat (€)'));
        $this->assertNull($this->findColumn($sheet, 'Valeur estimée (€)'));
    }

    public function test_an_untouched_export_imports_without_any_change(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $this->wineIn($this->compartment($cellar), ['name' => 'Château Talbot', 'price_cents' => 4250, 'purchased_on' => '2024-03-12', 'tags' => ['garde']]);
        $this->wineIn($this->compartment($cellar, 2), ['name' => 'Chablis', 'category' => WineCategory::White, 'format' => BottleFormat::Half]);
        $this->wineIn($this->compartment($cellar, 2), ['name' => 'Beaujolais', 'quantity' => 0, 'finished_at' => now()]);

        $file = $this->upload($this->load($this->actingAs($user)->get(route('wines.export'))));
        $token = $this->preview($user, $file);

        $this->actingAs($user)
            ->get(route('wines.import', ['token' => $token]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('wines/import')
                ->has('preview.rows', 3)
                ->where('preview.rows.0.action', 'unchanged')
                ->where('preview.rows.1.action', 'unchanged')
                ->where('preview.rows.2.action', 'unchanged'),
            );

        $this->actingAs($user)
            ->post(route('wines.confirm', $token))
            ->assertRedirect(route('wines.index'))
            ->assertInertiaFlash('toast.message', 'Rien à importer : ta cave était déjà à jour.');

        $this->assertSame(0, WineMovement::query()->where('type', MovementType::Updated)->count());
    }

    public function test_an_edited_file_updates_and_adds_wines(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $talbot = $this->wineIn($this->compartment($cellar), ['name' => 'Château Talbot', 'quantity' => 6, 'initial_quantity' => 6]);
        $chablis = $this->wineIn($this->compartment($cellar), ['name' => 'Chablis', 'category' => WineCategory::White, 'quantity' => 2]);

        $spreadsheet = $this->load($this->actingAs($user)->get(route('wines.export')));
        $sheet = $spreadsheet->getSheetByName(WineSheet::SHEET);
        $this->assertNotNull($sheet);

        $row = $this->rowOf($sheet, 'Château Talbot');
        $sheet->setCellValue([$this->column($sheet, 'Quantité'), $row], 4);
        $sheet->setCellValue([$this->column($sheet, 'Clayette'), $row], $this->compartment($cellar, 2)->name);
        $sheet->setCellValue([$this->column($sheet, 'Notes'), $row], 'Gardé pour les 40 ans');

        $sheet->setCellValue([$this->column($sheet, 'Quantité'), $this->rowOf($sheet, 'Chablis')], 0);

        $new = 4;
        foreach ([
            'Nom' => 'Clos Rougeard Le Bourg',
            'Domaine' => 'Clos Rougeard',
            'Couleur' => 'rouge',
            'Millésime' => '2018',
            'Cépages' => 'Cabernet Franc',
            'Format' => '1,5 l',
            'Quantité' => '3',
            'Cave' => 'cave du salon',
            'Clayette' => '2',
            'Prix d’achat (€)' => '125,50 €',
            'Date d’achat' => '12/03/2024',
            'Étiquettes' => 'Garde; Loire',
        ] as $header => $value) {
            $sheet->setCellValue([$this->column($sheet, $header), $new], $value);
        }

        $token = $this->preview($user, $this->upload($spreadsheet));

        $this->actingAs($user)
            ->get(route('wines.import', ['token' => $token]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('preview.rows.0.name', 'Chablis')
                ->where('preview.rows.0.action', 'update')
                ->where('preview.rows.0.changes', ['Quantité'])
                ->where('preview.rows.1.name', 'Château Talbot')
                ->where('preview.rows.1.action', 'update')
                ->where('preview.rows.1.changes', ['Quantité', 'Notes', 'Emplacement'])
                ->where('preview.rows.2.action', 'create')
                ->where('preview.rows.2.place', 'Cave du salon · '.$this->compartment($cellar, 1)->name)
                ->missing('preview.rows.0.data'),
            );

        $this->actingAs($user)
            ->post(route('wines.confirm', $token))
            ->assertRedirect(route('wines.index'))
            ->assertInertiaFlash('toast.message', '1 vin ajouté et 2 vins modifiés 🍷');

        $talbot->refresh();
        $this->assertSame(4, $talbot->quantity);
        $this->assertSame(6, $talbot->initial_quantity);
        $this->assertSame($this->compartment($cellar, 2)->id, $talbot->compartment_id);
        $this->assertSame('Gardé pour les 40 ans', $talbot->description);
        $this->assertTrue($talbot->movements()->where('type', MovementType::Moved)->exists());

        $this->assertNotNull($chablis->refresh()->finished_at);

        $clos = Wine::query()->where('name', 'Clos Rougeard Le Bourg')->sole();
        $this->assertSame(WineCategory::Red, $clos->category);
        $this->assertSame(BottleFormat::Magnum, $clos->format);
        $this->assertSame(2018, $clos->vintage);
        $this->assertSame(3, $clos->quantity);
        $this->assertSame(12550, $clos->price_cents);
        $this->assertSame('2024-03-12', $clos->purchased_on?->format('Y-m-d'));
        $this->assertSame(['garde', 'loire'], $clos->tags);
        $this->assertSame(['Cabernet Franc'], $clos->grapes);
        $this->assertSame($this->compartment($cellar, 1)->id, $clos->compartment_id);
        $this->assertSame($user->id, $clos->created_by);
        $this->assertNotNull($clos->drink_from);
        $this->assertTrue($clos->movements()->where('type', MovementType::Added)->exists());
    }

    public function test_rows_with_errors_are_reported_and_skipped(): void
    {
        [$user, , $cellar] = $this->userWithCellar();
        $csv = "Nom;Couleur;Millésime;Quantité;Clayette\n"
            ."Sancerre Les Romains;Blanc;2022;3;\n"
            ."Mystère;Bleu;deux mille;2;\n"
            .";Rouge;2020;1;\n"
            ."Côtes du Rhône;Rouge;2021;2;Clayette 9\n"
            .";;;;\n";

        $token = $this->preview($user, UploadedFile::fake()->createWithContent('ma-liste.csv', $csv));

        $this->actingAs($user)
            ->get(route('wines.import', ['token' => $token]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('preview.rows', 4)
                ->where('preview.rows.0.action', 'create')
                ->where('preview.rows.0.row', 2)
                ->where('preview.rows.1.action', 'error')
                ->where('preview.rows.1.errors', fn (Collection $errors) => str_contains($errors->implode(' '), 'Couleur « Bleu » inconnue')
                    && str_contains($errors->implode(' '), '« deux mille » n’est pas un nombre entier'))
                ->where('preview.rows.2.errors', ['Le nom du vin est obligatoire.'])
                ->where('preview.rows.3.errors', ['La clayette « Clayette 9 » n’existe dans aucune cave.']),
            );

        $this->actingAs($user)->post(route('wines.confirm', $token))->assertRedirect(route('wines.index'));

        $wine = Wine::query()->sole();
        $this->assertSame('Sancerre Les Romains', $wine->name);
        $this->assertSame(WineCategory::White, $wine->category);
        $this->assertSame(BottleFormat::Standard, $wine->format);
        $this->assertSame($this->compartment($cellar)->id, $wine->compartment_id);
    }

    public function test_formats_are_recognised_by_name_or_volume(): void
    {
        [$user] = $this->userWithCellar();
        $csv = "Nom;Format\nChianti;1 l\nLambrusco;100cl\nVin de table;Litre\nPinot;Magnum\nVin jaune;62 cl\nSauternes;37,5 cl\n";

        $token = $this->preview($user, UploadedFile::fake()->createWithContent('formats.csv', $csv));
        $this->actingAs($user)->post(route('wines.confirm', $token));

        $this->assertSame([
            'Chianti' => BottleFormat::Liter,
            'Lambrusco' => BottleFormat::Liter,
            'Vin de table' => BottleFormat::Liter,
            'Pinot' => BottleFormat::Magnum,
            'Vin jaune' => BottleFormat::Clavelin,
            'Sauternes' => BottleFormat::Half,
        ], Wine::query()->orderBy('id')->get()->mapWithKeys(fn (Wine $wine) => [$wine->name => $wine->format])->all());
    }

    public function test_a_file_without_a_name_column_is_refused(): void
    {
        [$user] = $this->userWithCellar();

        $this->actingAs($user)
            ->from(route('wines.import'))
            ->post(route('wines.preview'), ['file' => UploadedFile::fake()->createWithContent('liste.csv', "Foo;Bar\n1;2\n")])
            ->assertRedirect(route('wines.import'))
            ->assertSessionHasErrors('file');

        $this->actingAs($user)
            ->post(route('wines.preview'), ['file' => UploadedFile::fake()->create('photo.pdf', 10)])
            ->assertSessionHasErrors('file');
    }

    public function test_members_without_prices_cannot_change_them_by_import(): void
    {
        [$owner, $household, $cellar] = $this->userWithCellar();
        $wine = $this->wineIn($this->compartment($cellar), ['name' => 'Château Talbot', 'price_cents' => 4250]);
        $spreadsheet = $this->load($this->actingAs($owner)->get(route('wines.export')));
        $sheet = $spreadsheet->getSheetByName(WineSheet::SHEET);
        $this->assertNotNull($sheet);
        $sheet->setCellValue([$this->column($sheet, 'Prix d’achat (€)'), 2], 1);
        $sheet->setCellValue([$this->column($sheet, 'Quantité'), 2], 1);

        $household->update(['share_prices' => false]);
        $member = $this->joinHousehold($household);
        $token = $this->preview($member, $this->upload($spreadsheet));

        $this->actingAs($member)
            ->get(route('wines.import', ['token' => $token]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('preview.rows.0.changes', ['Quantité'])
                ->has('preview.notices', 1),
            );

        $this->actingAs($member)->post(route('wines.confirm', $token));

        $this->assertSame(4250, $wine->refresh()->price_cents);
        $this->assertSame(1, $wine->quantity);
    }

    public function test_a_preview_belongs_to_the_user_who_uploaded_it(): void
    {
        [$owner, $household] = $this->userWithCellar();
        $token = $this->preview($owner, UploadedFile::fake()->createWithContent('liste.csv', "Nom;Quantité\nSancerre;2\n"));
        $member = $this->joinHousehold($household);

        $this->actingAs($member)
            ->get(route('wines.import', ['token' => $token]))
            ->assertInertia(fn (Assert $page) => $page->where('preview', null)->where('expired', true));

        $this->actingAs($member)
            ->post(route('wines.confirm', $token))
            ->assertSessionHasErrors('file');

        $this->assertSame(0, Wine::query()->count());
    }

    private function preview(User $user, UploadedFile $file): string
    {
        $response = $this->actingAs($user)->post(route('wines.preview'), ['file' => $file]);
        $response->assertSessionHasNoErrors();

        parse_str((string) parse_url((string) $response->headers->get('Location'), PHP_URL_QUERY), $query);
        $this->assertIsString($query['token'] ?? null);

        return $query['token'];
    }

    /**
     * @param  TestResponse<Response>  $response
     */
    private function load(TestResponse $response): Spreadsheet
    {
        $path = tempnam(sys_get_temp_dir(), 'vinora').'.xlsx';
        file_put_contents($path, $response->streamedContent());

        return IOFactory::load($path);
    }

    private function upload(Spreadsheet $spreadsheet): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'vinora').'.xlsx';
        (new Xlsx($spreadsheet))->save($path);

        return new UploadedFile($path, 'cave.xlsx', null, null, true);
    }

    private function findColumn(Worksheet $sheet, string $header): ?int
    {
        $highest = Coordinate::columnIndexFromString($sheet->getHighestDataColumn());

        for ($column = 1; $column <= $highest; $column++) {
            if ($sheet->getCell([$column, 1])->getValue() === $header) {
                return $column;
            }
        }

        return null;
    }

    private function column(Worksheet $sheet, string $header): int
    {
        $column = $this->findColumn($sheet, $header);
        $this->assertNotNull($column, "Colonne « {$header} » absente.");

        return $column;
    }

    private function rowOf(Worksheet $sheet, string $name): int
    {
        $column = $this->column($sheet, 'Nom');

        for ($row = 2; $row <= $sheet->getHighestDataRow(); $row++) {
            if ($sheet->getCell([$column, $row])->getValue() === $name) {
                return $row;
            }
        }

        $this->fail("Vin « {$name} » absent de l’export.");
    }

    private function value(Worksheet $sheet, string $header, int $row): mixed
    {
        return $sheet->getCell([$this->column($sheet, $header), $row])->getValue();
    }
}
