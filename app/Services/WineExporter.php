<?php

namespace App\Services;

use App\Enums\AgingPotential;
use App\Enums\BottleFormat;
use App\Enums\WineCategory;
use App\Models\Cellar;
use App\Models\Compartment;
use App\Models\Household;
use App\Models\Wine;
use App\Models\WineMovement;
use App\Support\DrinkWindow;
use App\Support\WineSheet;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Every wine of a household in an Excel workbook that can be edited and
 * imported back.
 */
class WineExporter
{
    private const HEADER_FILL = '9F1239';

    private const INFO_FILL = '6B5B5E';

    private const MAX_ROWS = 2000;

    public function export(Household $household, bool $withPrices): Spreadsheet
    {
        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()
            ->setCreator('Vinora')
            ->setTitle("Cave — {$household->name}")
            ->setDescription('Export des vins de '.$household->name);

        $wines = $this->wines($household);
        $cellars = $household->cellars()->with('compartments')->get();

        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle(WineSheet::SHEET);
        $this->fillWines($sheet, $wines, $withPrices);

        $lists = $spreadsheet->createSheet();
        $lists->setTitle(WineSheet::LISTS_SHEET);
        $this->fillLists($lists, $cellars);
        $this->addValidations($sheet, $withPrices, $cellars->count());

        $history = $spreadsheet->createSheet();
        $history->setTitle(WineSheet::HISTORY_SHEET);
        $this->fillHistory($history, $household);

        $help = $spreadsheet->createSheet();
        $help->setTitle(WineSheet::HELP_SHEET);
        $this->fillHelp($help, $withPrices);

        $spreadsheet->setActiveSheetIndex(0);

        return $spreadsheet;
    }

    /**
     * @return Collection<int, Wine>
     */
    private function wines(Household $household): Collection
    {
        return $household->wines()
            ->with(['compartment.cellar', 'creator'])
            ->get()
            ->sortBy([
                fn (Wine $a, Wine $b) => ($a->finished_at === null ? 0 : 1) <=> ($b->finished_at === null ? 0 : 1),
                fn (Wine $a, Wine $b) => ($a->compartment->cellar->position ?? PHP_INT_MAX) <=> ($b->compartment->cellar->position ?? PHP_INT_MAX),
                fn (Wine $a, Wine $b) => ($a->compartment->position ?? PHP_INT_MAX) <=> ($b->compartment->position ?? PHP_INT_MAX),
                fn (Wine $a, Wine $b) => strcmp(mb_strtolower($a->name), mb_strtolower($b->name)),
                fn (Wine $a, Wine $b) => ($a->vintage ?? 0) <=> ($b->vintage ?? 0),
            ])
            ->values();
    }

    /**
     * @param  Collection<int, Wine>  $wines
     */
    private function fillWines(Worksheet $sheet, Collection $wines, bool $withPrices): void
    {
        $columns = WineSheet::columns($withPrices);

        foreach ($columns as $index => $column) {
            $letter = Coordinate::stringFromColumnIndex($index + 1);
            $sheet->setCellValue("{$letter}1", $column['label']);
            $sheet->getColumnDimension($letter)->setWidth($column['width']);

            $style = $sheet->getStyle("{$letter}1");
            $style->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
            $style->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB($column['import'] ? self::HEADER_FILL : self::INFO_FILL);
            $style->getAlignment()->setVertical(Alignment::VERTICAL_CENTER)->setWrapText(true);

            if (! $column['import']) {
                $sheet->getComment("{$letter}1")->getText()->createText('Pour information : cette colonne n’est pas relue à l’import.');
            }
        }

        $sheet->getRowDimension(1)->setRowHeight(30);

        foreach ($wines as $offset => $wine) {
            $row = $offset + 2;

            foreach ($columns as $index => $column) {
                $value = $this->value($wine, $column['key']);

                if ($value === null || $value === '') {
                    continue;
                }

                $letter = Coordinate::stringFromColumnIndex($index + 1);
                $sheet->setCellValue("{$letter}{$row}", $value);

                if ($column['money'] ?? false) {
                    $sheet->getStyle("{$letter}{$row}")->getNumberFormat()->setFormatCode('#,##0.00 "€"');
                }

                if ($column['date'] ?? false) {
                    $sheet->getStyle("{$letter}{$row}")->getNumberFormat()->setFormatCode('dd/mm/yyyy');
                }
            }

            if ($wine->finished_at !== null) {
                $last = Coordinate::stringFromColumnIndex(count($columns));
                $sheet->getStyle("A{$row}:{$last}{$row}")->getFont()->getColor()->setRGB('8A8A8A');
            }
        }

        $last = Coordinate::stringFromColumnIndex(count($columns));
        $sheet->freezePane('C2');
        $sheet->setAutoFilter("A1:{$last}".max(2, $wines->count() + 1));
    }

    private function value(Wine $wine, string $key): mixed
    {
        return match ($key) {
            'id' => $wine->id,
            'name' => $wine->name,
            'producer' => $wine->producer,
            'category' => $wine->category->label(),
            'vintage' => $wine->vintage,
            'appellation' => $wine->appellation,
            'region' => $wine->region,
            'country' => $wine->country,
            'grapes' => implode(', ', $wine->grapes ?? []),
            'alcohol' => $wine->alcohol,
            'format' => $wine->format->label(),
            'quantity' => $wine->quantity,
            'cellar' => $wine->compartment?->cellar->name,
            'compartment' => $wine->compartment?->name,
            'price' => $wine->price_cents !== null ? $wine->price_cents / 100 : null,
            'value' => $wine->value_cents !== null ? $wine->value_cents / 100 : null,
            'purchased_on' => $this->date($wine->purchased_on),
            'bought_from' => $wine->bought_from,
            'aging' => $wine->aging?->label(),
            'drink_from' => $wine->drink_from,
            'drink_until' => $wine->drink_until,
            'keepsake' => $wine->keepsake ? 'Oui' : null,
            'tags' => implode(', ', $wine->tags ?? []),
            'description' => $wine->description,
            'window' => $this->windowLabel($wine),
            'rating' => $wine->rating,
            'initial_quantity' => $wine->initial_quantity,
            'status' => $wine->finished_at === null ? 'En cave' : 'Terminée',
            'finished_at' => $this->date($wine->finished_at),
            'created_at' => $this->date($wine->created_at),
            'created_by' => $wine->creator?->name,
            'photo' => $wine->photoUrl(),
            default => null,
        };
    }

    private function date(?CarbonInterface $date): ?float
    {
        if ($date === null) {
            return null;
        }

        $value = ExcelDate::PHPToExcel($date->copy()->startOfDay()->format('Y-m-d'));

        return is_numeric($value) ? (float) $value : null;
    }

    private function windowLabel(Wine $wine): string
    {
        return match ($wine->windowStatus()) {
            DrinkWindow::YOUNG => "Trop jeune (dès {$wine->drink_from})",
            DrinkWindow::READY => $wine->drink_until !== null ? "À boire (jusqu’en {$wine->drink_until})" : 'À boire',
            DrinkWindow::SOON => 'À boire cette année',
            DrinkWindow::PAST => "Passé (depuis {$wine->drink_until})",
            DrinkWindow::KEEP => 'À garder (ne pas boire)',
            default => '',
        };
    }

    /**
     * @param  Collection<int, Cellar>  $cellars
     */
    private function fillLists(Worksheet $sheet, Collection $cellars): void
    {
        $lists = [
            'Couleurs' => array_map(fn (WineCategory $category) => $category->label(), WineCategory::cases()),
            'Formats' => array_map(fn (BottleFormat $format) => $format->label(), BottleFormat::cases()),
            'Potentiels de garde' => array_map(fn (AgingPotential $aging) => $aging->label(), AgingPotential::cases()),
            'Caves' => $cellars->pluck('name')->all(),
        ];

        foreach ($cellars as $cellar) {
            $lists["Clayettes — {$cellar->name}"] = $cellar->compartments->pluck('name')->all();
        }

        $index = 1;

        foreach ($lists as $title => $values) {
            $letter = Coordinate::stringFromColumnIndex($index);
            $sheet->setCellValue("{$letter}1", $title);
            $sheet->getStyle("{$letter}1")->getFont()->setBold(true);
            $sheet->getColumnDimension($letter)->setWidth(max(16, min(34, mb_strlen($title) + 4)));

            foreach (array_values($values) as $row => $value) {
                $sheet->setCellValue($letter.($row + 2), $value);
            }

            $index++;
        }

        $sheet->freezePane('A2');
    }

    private function addValidations(Worksheet $sheet, bool $withPrices, int $cellarCount): void
    {
        $lists = [
            'category' => '$A$2:$A$'.(count(WineCategory::cases()) + 1),
            'format' => '$B$2:$B$'.(count(BottleFormat::cases()) + 1),
            'aging' => '$C$2:$C$'.(count(AgingPotential::cases()) + 1),
        ];

        if ($cellarCount > 0) {
            $lists['cellar'] = '$D$2:$D$'.($cellarCount + 1);
        }

        // Written in the rule itself rather than in the « Listes » sheet.
        $lists['keepsake'] = '"Oui,Non"';

        foreach (WineSheet::columns($withPrices) as $index => $column) {
            if (! isset($lists[$column['key']])) {
                continue;
            }

            $letter = Coordinate::stringFromColumnIndex($index + 1);
            $range = "{$letter}2:{$letter}".self::MAX_ROWS;

            $validation = new DataValidation;
            $validation->setType(DataValidation::TYPE_LIST)
                ->setErrorStyle(DataValidation::STYLE_STOP)
                ->setAllowBlank(true)
                ->setShowDropDown(true)
                ->setShowErrorMessage(true)
                ->setErrorTitle('Valeur inconnue')
                ->setError('Choisis une valeur dans la liste (onglet « '.WineSheet::LISTS_SHEET.' »).')
                ->setFormula1(str_starts_with($lists[$column['key']], '"')
                    ? $lists[$column['key']]
                    : "'".WineSheet::LISTS_SHEET."'!".$lists[$column['key']]);

            $sheet->setDataValidation($range, $validation);
        }
    }

    private function fillHistory(Worksheet $sheet, Household $household): void
    {
        $headers = ['Date', 'Action', 'Vin', 'Millésime', 'Couleur', 'Quantité', 'Depuis', 'Vers', 'Par', 'Note (/5)', 'Commentaire'];
        $widths = [17, 13, 34, 11, 14, 10, 26, 26, 13, 10, 50];

        foreach ($headers as $index => $header) {
            $letter = Coordinate::stringFromColumnIndex($index + 1);
            $sheet->setCellValue("{$letter}1", $header);
            $sheet->getColumnDimension($letter)->setWidth($widths[$index]);
            $style = $sheet->getStyle("{$letter}1");
            $style->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
            $style->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB(self::INFO_FILL);
        }

        $movements = $household->movements()
            ->with(['user', 'fromCompartment.cellar', 'toCompartment.cellar'])
            ->latest('created_at')
            ->latest('id')
            ->get();

        foreach ($movements as $offset => $movement) {
            /** @var WineMovement $movement */
            $row = $offset + 2;
            $date = $movement->created_at !== null ? ExcelDate::PHPToExcel($movement->created_at->format('Y-m-d H:i:s')) : null;

            $values = [
                is_numeric($date) ? (float) $date : null,
                Str::ucfirst(Str::after($movement->type->verb(), 'a ')),
                $movement->wine_name,
                $movement->wine_vintage,
                $movement->wine_category->label(),
                $movement->quantity,
                $this->place($movement->fromCompartment),
                $this->place($movement->toCompartment),
                $movement->user?->name,
                $movement->rating,
                $movement->note,
            ];

            foreach ($values as $index => $value) {
                if ($value !== null && $value !== '') {
                    $sheet->setCellValue(Coordinate::stringFromColumnIndex($index + 1).$row, $value);
                }
            }

            $sheet->getStyle("A{$row}")->getNumberFormat()->setFormatCode('dd/mm/yyyy hh:mm');
        }

        $sheet->freezePane('A2');

        if ($movements->isNotEmpty()) {
            $sheet->setAutoFilter('A1:K'.($movements->count() + 1));
        }
    }

    private function place(?Compartment $compartment): ?string
    {
        return $compartment !== null ? "{$compartment->cellar->name} · {$compartment->name}" : null;
    }

    private function fillHelp(Worksheet $sheet, bool $withPrices): void
    {
        $lines = [
            ['Vinora — export de ta cave', true],
            ['', false],
            ['Modifier puis réimporter', true],
            ['• Chaque ligne de l’onglet « Vins » est un lot : un même vin, au même millésime et au même format, rangé sur une clayette.', false],
            ['• Un vin rangé à deux endroits occupe deux lignes (une par clayette).', false],
            ['• Garde la colonne « ID » pour mettre à jour un vin existant. Laisse-la vide pour ajouter un nouveau vin.', false],
            ['• Les colonnes à en-tête bordeaux sont relues à l’import ; les colonnes grises sont seulement informatives.', false],
            ['• « Couleur », « Format », « Potentiel de garde » et « Cave » proposent une liste : leurs valeurs sont dans l’onglet « Listes ».', false],
            ['• « Clayette » doit exister dans la cave indiquée (voir l’onglet « Listes »). Si elle est vide, le vin va sur la première clayette.', false],
            ['• « Quantité » à 0 marque un vin comme terminé.', false],
            ['• « Ne pas boire » à « Oui » : un cadeau, un souvenir ou une bouteille de collection, que Vinora ne proposera jamais à boire.', false],
            ['• « Cépages » et « Étiquettes » : sépare les valeurs par des virgules.', false],
            ['• Si « À boire dès » et « À boire jusqu’en » sont vides, Vinora calcule la fenêtre depuis le millésime et le potentiel de garde.', false],
            ...($withPrices ? [['• Les prix sont par bouteille, en euros.', false]] : []),
            ['', false],
            ['Importer', true],
            ['Dans Vinora : Bouteilles → Excel → Importer un fichier. Tu verras un aperçu (ajouts, modifications, erreurs) avant de confirmer.', false],
            ['L’onglet « Historique » n’est pas relu : il garde la trace de tout ce qui est entré et sorti de la cave.', false],
        ];

        foreach ($lines as $index => [$text, $bold]) {
            $sheet->setCellValue('A'.($index + 1), $text);
            $sheet->getStyle('A'.($index + 1))->getFont()->setBold($bold)->setSize($index === 0 ? 16 : 11);
        }

        $sheet->getColumnDimension('A')->setWidth(130);
    }
}
