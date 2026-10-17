<?php

namespace App\Http\Controllers;

use App\Services\WineExporter;
use App\Services\WineImporter;
use App\Support\WineSheet;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Every wine of the household in an Excel file, and back.
 */
class WineSpreadsheetController extends Controller
{
    public function export(Request $request, WineExporter $exporter): StreamedResponse
    {
        $household = $this->household($request);
        $spreadsheet = $exporter->export($household, $this->canSeePrices($request));
        $filename = 'vinora-'.(Str::slug($household->name) ?: 'cave').'-'.now()->format('Y-m-d').'.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            (new Xlsx($spreadsheet))->save('php://output');
            $spreadsheet->disconnectWorksheets();
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'no-store, max-age=0',
        ]);
    }

    public function create(Request $request, WineImporter $importer): Response
    {
        $household = $this->household($request);
        $plan = $request->filled('token')
            ? $importer->plan($request->string('token')->toString(), $household, $this->user($request))
            : null;

        return Inertia::render('wines/import', [
            'preview' => $plan === null ? null : [
                'token' => $request->string('token')->toString(),
                'file' => $plan['file'],
                'columns' => $plan['columns'],
                'ignored' => $plan['ignored'],
                'notices' => $plan['notices'],
                'rows' => array_map(fn (array $row) => collect($row)->except('data')->all(), $plan['rows']),
            ],
            'expired' => $request->filled('token') && $plan === null,
            'hasCellars' => $household->cellars()->exists(),
            'withPrices' => $this->canSeePrices($request),
            'maxRows' => WineImporter::MAX_ROWS,
            'sheet' => WineSheet::SHEET,
        ]);
    }

    public function store(Request $request, WineImporter $importer): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:10240', 'extensions:xlsx,xls,ods,csv'],
        ], [
            'file.required' => 'Choisis un fichier Excel.',
            'file.extensions' => 'Choisis un fichier Excel (.xlsx, .xls), OpenDocument (.ods) ou CSV.',
            'file.max' => 'Ce fichier est trop lourd (10 Mo au maximum).',
        ]);

        /** @var UploadedFile $file */
        $file = $request->file('file');

        $token = $importer->prepare(
            $this->household($request),
            $this->user($request),
            $file,
            $this->canSeePrices($request),
        );

        return redirect()->route('wines.import', ['token' => $token]);
    }

    public function confirm(Request $request, string $token, WineImporter $importer): RedirectResponse
    {
        $result = $importer->apply($token, $this->household($request), $this->user($request));

        $count = fn (int $count, string $done) => $count.($count > 1 ? " vins {$done}s" : " vin {$done}");
        $parts = array_filter([
            $result['created'] > 0 ? $count($result['created'], 'ajouté') : null,
            $result['updated'] > 0 ? $count($result['updated'], 'modifié') : null,
        ]);

        if ($parts === []) {
            $this->toast('Rien à importer : ta cave était déjà à jour.', 'info');
        } else {
            $this->toast(implode(' et ', $parts).' 🍷');
        }

        if ($result['created'] > 0) {
            $this->celebrate();
        }

        return redirect()->route('wines.index');
    }

    private function canSeePrices(Request $request): bool
    {
        return (bool) $request->attributes->get('canSeePrices', false);
    }
}
