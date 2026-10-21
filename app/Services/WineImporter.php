<?php

namespace App\Services;

use App\Enums\AgingPotential;
use App\Enums\BottleFormat;
use App\Enums\WineCategory;
use App\Http\Requests\WineRequest;
use App\Models\Cellar;
use App\Models\Compartment;
use App\Models\Household;
use App\Models\User;
use App\Models\Wine;
use App\Support\WineSheet;
use DateTimeImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\Csv;
use PhpOffice\PhpSpreadsheet\RichText\RichText;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use Throwable;

/**
 * Reads back an Excel export, or any sheet with recognisable headers: a row
 * with an ID updates that wine, a row without one adds a new wine. Nothing
 * is written before the user has seen the preview and confirmed it.
 *
 * @phpstan-type ImportRow array{row: int, action: string, wineId: int|null, name: string, vintage: int|null, category: string|null, quantity: int|null, format: string|null, place: string|null, changes: list<string>, errors: list<string>, warnings: list<string>, data: array<string, mixed>}
 * @phpstan-type ImportPlan array{household: int, user: int, file: string, rows: list<ImportRow>, columns: list<string>, ignored: list<string>, notices: list<string>}
 */
class WineImporter
{
    public const MAX_ROWS = 2000;

    public const CREATE = 'create';

    public const UPDATE = 'update';

    public const UNCHANGED = 'unchanged';

    public const ERROR = 'error';

    private const CACHE_PREFIX = 'wine-import:';

    /** Columns that keep the current value of a wine when their cell is empty. */
    private const KEEP_WHEN_EMPTY = ['category', 'format', 'quantity'];

    /** @var Collection<int, Cellar> */
    private Collection $cellars;

    /** @var array<int, Compartment> */
    private array $compartments = [];

    public function __construct(private readonly Inventory $inventory) {}

    /**
     * Read the file and keep what it would change for 30 minutes. Returns
     * the token of this plan.
     */
    public function prepare(Household $household, User $user, UploadedFile $file, bool $withPrices): string
    {
        $rows = $this->read($file);
        [$headerIndex, $map, $ignored] = $this->headers($rows, $withPrices);

        $this->cellars = $household->cellars()->with('compartments')->get();
        $this->compartments = [];

        foreach ($this->cellars as $cellar) {
            foreach ($cellar->compartments as $compartment) {
                $compartment->setRelation('cellar', $cellar);
                $this->compartments[$compartment->id] = $compartment;
            }
        }

        $wines = $household->wines()->get()->keyBy('id');
        $twins = $wines
            ->filter(fn (Wine $wine) => $wine->finished_at === null && $wine->quantity > 0)
            ->mapWithKeys(fn (Wine $wine) => [$wine->compartment_id.'#'.$wine->identityKey() => true])
            ->all();

        $plan = [];
        $seen = [];

        foreach (array_slice($rows, $headerIndex + 1, null, true) as $index => $cells) {
            $values = [];

            foreach ($map as $key => $column) {
                $values[$key] = $cells[$column] ?? null;
            }

            if ($this->isBlank($values)) {
                continue;
            }

            if (count($plan) >= self::MAX_ROWS) {
                throw ValidationException::withMessages([
                    'file' => 'Ce fichier contient plus de '.self::MAX_ROWS.' lignes : découpe-le en plusieurs fichiers.',
                ]);
            }

            $plan[] = $this->row($index + 1, $values, $wines, $twins, $seen, $withPrices);
        }

        if ($plan === []) {
            throw ValidationException::withMessages([
                'file' => 'Aucun vin trouvé sous la ligne des en-têtes.',
            ]);
        }

        $notices = [];

        if (! $withPrices && $this->hasPriceColumn($rows[$headerIndex])) {
            $notices[] = 'Les prix et les valeurs ne sont pas importés : seuls les gérants de ce lieu peuvent les modifier.';
        }

        $token = Str::random(40);

        Cache::put(self::CACHE_PREFIX.$token, [
            'household' => $household->id,
            'user' => $user->id,
            'file' => $file->getClientOriginalName(),
            'rows' => $plan,
            'columns' => array_map(fn (string $key) => $this->label($key), array_keys($map)),
            'ignored' => $ignored,
            'notices' => $notices,
        ], now()->addMinutes(30));

        return $token;
    }

    /**
     * The plan of a previous upload, if it is still there and belongs to
     * this user and household.
     *
     * @return ImportPlan|null
     */
    public function plan(string $token, Household $household, User $user): ?array
    {
        $plan = Cache::get(self::CACHE_PREFIX.$token);

        if (! is_array($plan) || ($plan['household'] ?? null) !== $household->id || ($plan['user'] ?? null) !== $user->id) {
            return null;
        }

        /** @var ImportPlan $plan */
        return $plan;
    }

    /**
     * Write the valid rows of the plan, all of them or none.
     *
     * @return array{created: int, updated: int}
     */
    public function apply(string $token, Household $household, User $user): array
    {
        $plan = $this->plan($token, $household, $user);

        if ($plan === null) {
            throw ValidationException::withMessages([
                'file' => 'Cet aperçu a expiré : importe le fichier une nouvelle fois.',
            ]);
        }

        $compartments = $household->compartmentIds();

        $result = DB::transaction(function () use ($plan, $household, $user, $compartments) {
            $created = 0;
            $updated = 0;

            foreach ($plan['rows'] as $row) {
                $compartmentId = $row['data']['compartment_id'] ?? null;

                if ($compartmentId !== null && ! in_array($compartmentId, $compartments, true)) {
                    throw ValidationException::withMessages([
                        'file' => 'Les caves ont changé depuis l’aperçu : importe le fichier une nouvelle fois.',
                    ]);
                }

                if ($row['action'] === self::CREATE) {
                    $this->inventory->add($household, $user, $row['data']);
                    $created++;
                }

                if ($row['action'] === self::UPDATE && $row['wineId'] !== null) {
                    $wine = $household->wines()->find($row['wineId']);

                    if ($wine !== null) {
                        $this->inventory->update($wine, $user, $row['data']);
                        $updated++;
                    }
                }
            }

            return ['created' => $created, 'updated' => $updated];
        });

        Cache::forget(self::CACHE_PREFIX.$token);

        return $result;
    }

    /**
     * @return list<list<mixed>>
     */
    private function read(UploadedFile $file): array
    {
        $path = (string) $file->getRealPath();
        $type = match (strtolower($file->getClientOriginalExtension())) {
            'xlsx' => 'Xlsx',
            'xls' => 'Xls',
            'ods' => 'Ods',
            'csv', 'txt' => 'Csv',
            default => null,
        };

        try {
            $reader = $type !== null ? IOFactory::createReader($type) : IOFactory::createReaderForFile($path);
            $reader->setReadDataOnly(true);

            if ($reader instanceof Csv) {
                $reader->setInputEncoding(Csv::GUESS_ENCODING);
            }

            $spreadsheet = $reader->load($path);
            $sheet = $spreadsheet->getSheetByName(WineSheet::SHEET) ?? $spreadsheet->getSheet(0);
            $rows = $sheet->toArray(null, true, false, false);
            $spreadsheet->disconnectWorksheets();
        } catch (Throwable) {
            throw ValidationException::withMessages([
                'file' => 'Impossible de lire ce fichier. Enregistre-le au format Excel (.xlsx) puis réessaie.',
            ]);
        }

        return array_values(array_map(fn (array $row) => array_values($row), $rows));
    }

    /**
     * Find the header row (the first one with a « Nom » column) among the
     * first lines and map each known column to its index.
     *
     * @param  list<list<mixed>>  $rows
     * @return array{0: int, 1: array<string, int>, 2: list<string>}
     */
    private function headers(array $rows, bool $withPrices): array
    {
        $informative = array_map(
            fn (array $column) => WineSheet::normalize($column['label']),
            array_filter(WineSheet::columns(), fn (array $column) => ! $column['import'] || isset($column['money'])),
        );

        foreach (array_slice($rows, 0, 10, true) as $index => $cells) {
            $map = [];
            $ignored = [];

            foreach ($cells as $column => $header) {
                $key = WineSheet::keyForHeader($this->cell($header), $withPrices);

                if ($key !== null && ! isset($map[$key])) {
                    $map[$key] = $column;
                } elseif ($key === null && ($label = $this->text($header)) !== null && ! in_array(WineSheet::normalize($label), $informative, true)) {
                    $ignored[] = $label;
                }
            }

            if (isset($map['name'])) {
                return [$index, $map, $ignored];
            }
        }

        throw ValidationException::withMessages([
            'file' => 'Je n’ai pas trouvé la colonne « Nom ». Garde la ligne d’en-têtes de l’export (Nom, Domaine, Millésime…).',
        ]);
    }

    /**
     * @param  list<mixed>  $headers
     */
    private function hasPriceColumn(array $headers): bool
    {
        foreach ($headers as $header) {
            if (in_array(WineSheet::keyForHeader($this->cell($header), true), ['price', 'value'], true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $values
     * @param  Collection<int, Wine>  $wines
     * @param  array<string, true>  $twins
     * @param  array<int, int>  $seen
     * @return ImportRow
     */
    private function row(int $number, array $values, Collection $wines, array $twins, array &$seen, bool $withPrices): array
    {
        $errors = [];
        $warnings = [];

        $id = array_key_exists('id', $values) ? $this->integer($values['id'], 'ID', $errors) : null;
        $wine = $id !== null ? $wines->get($id) : null;

        if ($id !== null && $wine === null) {
            $warnings[] = "L’ID {$id} n’existe pas dans ce lieu : le vin sera ajouté comme nouveau.";
        }

        if ($wine !== null && isset($seen[$wine->id])) {
            $errors[] = "Ce vin (ID {$wine->id}) apparaît déjà ligne {$seen[$wine->id]}.";
        } elseif ($wine !== null) {
            $seen[$wine->id] = $number;
        }

        $data = [];

        foreach ($values as $key => $raw) {
            if (in_array($key, ['id', 'cellar', 'compartment'], true)) {
                continue;
            }

            $value = $this->parse($key, $raw, $errors);

            if ($value === null && $wine !== null && in_array($key, self::KEEP_WHEN_EMPTY, true)) {
                continue;
            }

            $data[$key] = $value;
        }

        if ($wine === null) {
            if (($data['category'] ?? null) === null) {
                $data['category'] = WineCategory::Other->value;

                if ($this->text($values['category'] ?? null) === null) {
                    $warnings[] = 'Couleur non précisée : le vin sera classé en « Autre ».';
                }
            }

            $data['format'] ??= BottleFormat::Standard->value;
            $data['quantity'] ??= 1;

            if ($data['quantity'] === 0) {
                $errors[] = 'Un nouveau vin doit avoir au moins une bouteille.';
            }
        }

        $compartmentId = $this->place(
            array_key_exists('cellar', $values) ? $this->text($values['cellar']) : null,
            array_key_exists('compartment', $values) ? $this->text($values['compartment']) : null,
            $wine,
            $errors,
        );

        if ($compartmentId !== null) {
            $data['compartment_id'] = $compartmentId;
        }

        $this->validate($data, $wine, $errors);

        foreach (['price' => 'price_cents', 'value' => 'value_cents'] as $input => $column) {
            if ($withPrices && array_key_exists($input, $data)) {
                $amount = $data[$input];
                $data[$column] = is_numeric($amount) ? (int) round(((float) $amount) * 100) : null;
            }

            unset($data[$input]);
        }

        $changes = [];
        $action = self::ERROR;

        if ($errors === []) {
            if ($wine === null) {
                $action = self::CREATE;

                if (isset($twins[($data['compartment_id'] ?? '').'#'.$this->identity($data)])) {
                    $warnings[] = 'Ce vin est déjà rangé à cet endroit : ces bouteilles s’ajouteront à part.';
                }
            } else {
                $changes = $this->changes($wine, $data);
                $action = $changes === [] ? self::UNCHANGED : self::UPDATE;
            }
        }

        $compartment = $this->compartments[(int) ($data['compartment_id'] ?? $wine->compartment_id ?? 0)] ?? null;
        $name = $data['name'] ?? $wine?->name;
        $vintage = array_key_exists('vintage', $data) ? $data['vintage'] : $wine?->vintage;
        $category = $data['category'] ?? $wine?->category->value;
        $quantity = $data['quantity'] ?? $wine?->quantity;
        $format = $data['format'] ?? $wine?->format->value;

        return [
            'row' => $number,
            'action' => $action,
            'wineId' => $wine?->id,
            'name' => is_string($name) ? $name : '',
            'vintage' => is_int($vintage) ? $vintage : null,
            'category' => is_string($category) ? $category : null,
            'quantity' => is_int($quantity) ? $quantity : null,
            'format' => is_string($format) ? $format : null,
            'place' => $compartment !== null ? "{$compartment->cellar->name} · {$compartment->name}" : null,
            'changes' => array_map(fn (string $key) => $this->label($key), $changes),
            'errors' => array_values(array_unique($errors)),
            'warnings' => $warnings,
            'data' => $action === self::CREATE || $action === self::UPDATE ? $data : [],
        ];
    }

    /**
     * @param  list<string>  $errors
     */
    private function parse(string $key, mixed $raw, array &$errors): mixed
    {
        $label = $this->label($key);

        return match ($key) {
            'vintage' => $this->vintage($raw, $label, $errors),
            'quantity', 'drink_from', 'drink_until' => $this->integer($raw, $label, $errors),
            'alcohol', 'price', 'value' => $this->decimal($raw, $label, $errors),
            'purchased_on' => $this->date($raw, $label, $errors),
            'category' => $this->category($raw, $errors),
            'format' => $this->format($raw, $errors),
            'aging' => $this->aging($raw, $errors),
            'keepsake' => $this->yes($raw, $errors),
            'grapes' => WineRequest::cleanList(str_replace(';', ',', (string) $this->text($raw))),
            'tags' => WineRequest::cleanList(str_replace(';', ',', (string) $this->text($raw)), lowercase: true),
            'description' => $this->text($raw, multiline: true),
            default => $this->text($raw),
        };
    }

    /**
     * Same limits as the form.
     *
     * @param  array<string, mixed>  $data
     * @param  list<string>  $errors
     */
    private function validate(array $data, ?Wine $wine, array &$errors): void
    {
        $text = fn (int $max) => ['nullable', 'string', 'max:'.$max];

        $validator = Validator::make($data, [
            'name' => ['required', 'string', 'max:120'],
            'producer' => $text(120),
            'vintage' => ['nullable', 'integer', 'between:1800,'.(now()->year + 1)],
            'appellation' => $text(120),
            'region' => $text(60),
            'country' => $text(60),
            'grapes' => ['nullable', 'array', 'max:'.WineRequest::MAX_GRAPES],
            'grapes.*' => ['string', 'max:40'],
            'alcohol' => ['nullable', 'numeric', 'between:0,30'],
            'quantity' => ['nullable', 'integer', 'between:0,999'],
            'price' => ['nullable', 'numeric', 'between:0,100000'],
            'value' => ['nullable', 'numeric', 'between:0,1000000'],
            'purchased_on' => ['nullable', 'date', 'before_or_equal:tomorrow'],
            'bought_from' => $text(80),
            'drink_from' => ['nullable', 'integer', 'between:1800,2300'],
            'drink_until' => ['nullable', 'integer', 'between:1800,2300'],
            'keepsake' => ['boolean'],
            'tags' => ['nullable', 'array', 'max:'.WineRequest::MAX_TAGS],
            'tags.*' => ['string', 'max:30'],
            'description' => $text(2000),
        ], [
            'name.required' => 'Le nom du vin est obligatoire.',
            'purchased_on.before_or_equal' => 'La date d’achat ne peut pas être dans le futur.',
        ], [
            ...collect(WineSheet::columns())->mapWithKeys(fn (array $column) => [$column['key'] => $column['label']])->all(),
            'grapes.*' => 'Cépages',
            'tags.*' => 'Étiquettes',
        ]);

        foreach ($validator->errors()->all() as $message) {
            $errors[] = $message;
        }

        $from = array_key_exists('drink_from', $data) ? $data['drink_from'] : $wine?->drink_from;
        $until = array_key_exists('drink_until', $data) ? $data['drink_until'] : $wine?->drink_until;

        if (is_int($from) && is_int($until) && $until < $from) {
            $errors[] = '« À boire jusqu’en » doit être après « À boire dès ».';
        }
    }

    /**
     * The compartment of the row: the named one, the first of the named
     * cellar, the current one of the wine, or the very first one.
     *
     * @param  list<string>  $errors
     */
    private function place(?string $cellarName, ?string $slotName, ?Wine $wine, array &$errors): ?int
    {
        $current = $wine?->compartment_id !== null ? ($this->compartments[$wine->compartment_id] ?? null) : null;

        if ($cellarName === null && $slotName === null) {
            if ($wine !== null) {
                return null;
            }

            $first = reset($this->compartments);

            if ($first === false) {
                $errors[] = 'Crée d’abord une cave pour y ranger tes vins.';

                return null;
            }

            return $first->id;
        }

        if ($cellarName !== null) {
            $cellar = $this->cellars->first(fn (Cellar $cellar) => WineSheet::normalize($cellar->name) === WineSheet::normalize($cellarName));

            if ($cellar === null) {
                $names = $this->cellars->pluck('name')->implode(', ');
                $errors[] = "La cave « {$cellarName} » n’existe pas".($names !== '' ? " (caves : {$names})." : '.');

                return null;
            }

            $slots = $cellar->compartments->values();

            if ($slotName === null) {
                if ($current !== null && $current->cellar_id === $cellar->id) {
                    return $current->id;
                }

                $first = $slots->first();

                if ($first === null) {
                    $errors[] = "La cave « {$cellar->name} » n’a encore aucune clayette.";
                }

                return $first?->id;
            }

            $slot = $slots->first(fn (Compartment $slot) => WineSheet::normalize($slot->name) === WineSheet::normalize($slotName));

            if ($slot === null && ctype_digit($slotName) && (int) $slotName >= 1) {
                $slot = $slots->get((int) $slotName - 1);
            }

            if ($slot === null) {
                $errors[] = "La clayette « {$slotName} » n’existe pas dans « {$cellar->name} ».";

                return null;
            }

            return $slot->id;
        }

        $matches = array_values(array_filter(
            $this->compartments,
            fn (Compartment $slot) => WineSheet::normalize($slot->name) === WineSheet::normalize($slotName),
        ));

        if (count($matches) > 1 && $current !== null) {
            $inSameCellar = array_values(array_filter($matches, fn (Compartment $slot) => $slot->cellar_id === $current->cellar_id));
            $matches = $inSameCellar !== [] ? $inSameCellar : $matches;
        }

        if (count($matches) === 1) {
            return $matches[0]->id;
        }

        $errors[] = $matches === []
            ? "La clayette « {$slotName} » n’existe dans aucune cave."
            : "Plusieurs caves ont une clayette « {$slotName} » : précise la cave.";

        return null;
    }

    /**
     * Keys whose value differs from the wine.
     *
     * @param  array<string, mixed>  $data
     * @return list<string>
     */
    private function changes(Wine $wine, array $data): array
    {
        $changes = [];

        foreach ($data as $key => $value) {
            $current = match ($key) {
                'category' => $wine->category->value,
                'format' => $wine->format->value,
                'aging' => $wine->aging?->value,
                'purchased_on' => $wine->purchased_on?->format('Y-m-d'),
                'grapes' => $wine->grapes ?? [],
                'tags' => $wine->tags ?? [],
                default => $wine->getAttribute($key),
            };

            if (! $this->same($current, $value)) {
                $changes[] = $key;
            }
        }

        return $changes;
    }

    private function same(mixed $current, mixed $value): bool
    {
        if (is_numeric($current) && is_numeric($value)) {
            return abs((float) $current - (float) $value) < 0.0001;
        }

        if (is_array($current) || is_array($value)) {
            return array_values((array) $current) === array_values((array) $value);
        }

        return ($current === '' ? null : $current) === ($value === '' ? null : $value);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function identity(array $data): string
    {
        $text = fn (mixed $value) => is_scalar($value) ? trim((string) $value) : '';

        return mb_strtolower(implode('|', [
            $text($data['name'] ?? ''),
            $text($data['producer'] ?? ''),
            $text($data['vintage'] ?? ''),
            $text($data['format'] ?? ''),
            $text($data['category'] ?? ''),
        ]));
    }

    private function label(string $key): string
    {
        $labels = [
            'compartment_id' => 'Emplacement',
            'price_cents' => 'Prix d’achat',
            'value_cents' => 'Valeur estimée',
        ];

        if (isset($labels[$key])) {
            return $labels[$key];
        }

        foreach (WineSheet::columns() as $column) {
            if ($column['key'] === $key) {
                return $column['label'];
            }
        }

        return $key;
    }

    /**
     * @param  array<string, mixed>  $values
     */
    private function isBlank(array $values): bool
    {
        foreach ($values as $value) {
            if ($this->text($value) !== null) {
                return false;
            }
        }

        return true;
    }

    private function cell(mixed $value): mixed
    {
        return $value instanceof RichText ? $value->getPlainText() : $value;
    }

    private function text(mixed $value, bool $multiline = false): ?string
    {
        $value = $this->cell($value);

        if (is_float($value) && floor($value) === $value && abs($value) < PHP_INT_MAX) {
            $value = (int) $value;
        }

        if (! is_scalar($value) || is_bool($value)) {
            return null;
        }

        $text = str_replace(["\r\n", "\r"], "\n", (string) $value);
        $text = $multiline ? trim($text) : trim((string) preg_replace('/\s+/u', ' ', $text));

        return $text === '' ? null : $text;
    }

    /**
     * @param  list<string>  $errors
     */
    private function integer(mixed $value, string $label, array &$errors): ?int
    {
        if (is_int($value)) {
            return $value;
        }

        if (is_float($value) && floor($value) === $value) {
            return (int) $value;
        }

        $text = $this->text($value);

        if ($text === null) {
            return null;
        }

        $clean = str_replace([' ', "\u{00A0}", "\u{202F}"], '', $text);

        if (preg_match('/^-?\d+$/', $clean) === 1) {
            return (int) $clean;
        }

        $errors[] = "« {$label} » : « {$text} » n’est pas un nombre entier.";

        return null;
    }

    /**
     * @param  list<string>  $errors
     */
    private function vintage(mixed $value, string $label, array &$errors): ?int
    {
        $normalized = WineSheet::normalize($this->text($value) ?? '');

        if (in_array($normalized, ['nm', 'n m', 'nv', 'sm', 's m', 'non millesime', 'sans millesime', 'non vintage'], true)) {
            return null;
        }

        return $this->integer($value, $label, $errors);
    }

    /**
     * @param  list<string>  $errors
     */
    private function decimal(mixed $value, string $label, array &$errors): ?float
    {
        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }

        $text = $this->text($value);

        if ($text === null) {
            return null;
        }

        $clean = str_ireplace([' ', "\u{00A0}", "\u{202F}", '€', '%', 'eur'], '', $text);

        if (str_contains($clean, ',') && str_contains($clean, '.')) {
            $clean = strrpos($clean, ',') > strrpos($clean, '.')
                ? str_replace('.', '', $clean)
                : str_replace(',', '', $clean);
        }

        $clean = str_replace(',', '.', $clean);

        if (is_numeric($clean)) {
            return (float) $clean;
        }

        $errors[] = "« {$label} » : « {$text} » n’est pas un nombre.";

        return null;
    }

    /**
     * A date as Y-m-d, from an Excel date or a written one (31/12/2024).
     *
     * @param  list<string>  $errors
     */
    private function date(mixed $value, string $label, array &$errors): ?string
    {
        if (is_int($value) || is_float($value)) {
            if (floor($value) === (float) $value && $value >= 1900 && $value <= 2100) {
                return ((int) $value).'-01-01';
            }

            if ($value > 0 && $value < 2958466) {
                return ExcelDate::excelToDateTimeObject($value)->format('Y-m-d');
            }
        }

        $text = $this->text($value);

        if ($text === null) {
            return null;
        }

        if (preg_match('/^\d{4}$/', $text) === 1) {
            return "{$text}-01-01";
        }

        foreach (['d/m/Y', 'd/m/y', 'd-m-Y', 'd.m.Y', 'Y-m-d', 'Y/m/d', 'd/m/Y H:i', 'd/m/Y H:i:s', 'Y-m-d H:i', 'Y-m-d H:i:s'] as $format) {
            $date = DateTimeImmutable::createFromFormat('!'.$format, $text);

            if ($date !== false && DateTimeImmutable::getLastErrors() === false) {
                return $date->format('Y-m-d');
            }
        }

        $errors[] = "« {$label} » : « {$text} » n’est pas une date (écris-la 31/12/2024).";

        return null;
    }

    /**
     * @param  list<string>  $errors
     */
    private function category(mixed $value, array &$errors): ?string
    {
        $key = WineSheet::normalize($this->text($value) ?? '');

        if ($key === '') {
            return null;
        }

        $synonyms = [
            'rouges' => WineCategory::Red, 'blancs' => WineCategory::White, 'roses' => WineCategory::Rose,
            'champagne' => WineCategory::Sparkling, 'cremant' => WineCategory::Sparkling, 'petillant' => WineCategory::Sparkling,
            'mousseux' => WineCategory::Sparkling, 'prosecco' => WineCategory::Sparkling, 'cava' => WineCategory::Sparkling,
            'moelleux' => WineCategory::Sweet, 'liquoreux' => WineCategory::Sweet, 'doux' => WineCategory::Sweet,
            'mute' => WineCategory::Fortified, 'fortifie' => WineCategory::Fortified, 'porto' => WineCategory::Fortified,
            'vin doux naturel' => WineCategory::Fortified, 'vdn' => WineCategory::Fortified, 'xeres' => WineCategory::Fortified,
            'autre' => WineCategory::Other,
        ];

        foreach (WineCategory::cases() as $case) {
            if (in_array($key, [WineSheet::normalize($case->label()), WineSheet::normalize($case->shortLabel()), $case->value], true)) {
                return $case->value;
            }
        }

        if (isset($synonyms[$key])) {
            return $synonyms[$key]->value;
        }

        $choices = implode(', ', array_map(fn (WineCategory $case) => $case->label(), WineCategory::cases()));
        $errors[] = "Couleur « {$this->text($value)} » inconnue (choisis : {$choices}).";

        return null;
    }

    /**
     * @param  list<string>  $errors
     */
    private function format(mixed $value, array &$errors): ?string
    {
        $text = $this->text($value);
        $key = WineSheet::normalize($text ?? '');

        if ($text === null || $key === '') {
            return null;
        }

        // Labels first, standard bottle first: « bouteilles » is the 75 cl
        // one, even though the 50 cl one is a « bouteille » too.
        $cases = [BottleFormat::Standard, ...array_filter(BottleFormat::cases(), fn (BottleFormat $case) => $case !== BottleFormat::Standard)];

        foreach ([fn (BottleFormat $case) => [$case->label(), $case->value], fn (BottleFormat $case) => [$case->singular(), $case->plural(), $case->volume()]] as $names) {
            foreach ($cases as $case) {
                if (in_array($key, array_map(fn (string $name) => WineSheet::normalize($name), $names($case)), true)) {
                    return $case->value;
                }
            }
        }

        $synonyms = ['standard' => BottleFormat::Standard, 'demi' => BottleFormat::Half, 'fillette' => BottleFormat::Half, 'double magnum' => BottleFormat::Jeroboam];

        if (isset($synonyms[$key])) {
            return $synonyms[$key]->value;
        }

        if (preg_match('/^(\d+(?:[.,]\d+)?)\s*(ml|cl|l|litres?)?$/i', $text, $match) === 1) {
            $amount = (float) str_replace(',', '.', $match[1]);
            $unit = strtolower($match[2] ?? '');
            $milliliters = match (true) {
                $unit === 'ml' => $amount,
                $unit === 'cl' => $amount * 10,
                $unit !== '' => $amount * 1000,
                $amount <= 10 => $amount * 1000,
                $amount <= 400 => $amount * 10,
                default => $amount,
            };

            foreach (BottleFormat::cases() as $case) {
                if (abs($case->milliliters() - $milliliters) <= 15) {
                    return $case->value;
                }
            }
        }

        $choices = implode(', ', array_map(fn (BottleFormat $case) => $case->label(), BottleFormat::cases()));
        $errors[] = "Format « {$text} » inconnu (choisis : {$choices}).";

        return null;
    }

    /**
     * @param  list<string>  $errors
     */
    private function yes(mixed $value, array &$errors): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        $key = WineSheet::normalize($this->text($value) ?? '');

        if (in_array($key, ['oui', 'o', 'yes', 'y', 'x', '1', 'vrai', 'true'], true)) {
            return true;
        }

        if (! in_array($key, ['', 'non', 'n', 'no', '0', 'faux', 'false'], true)) {
            $errors[] = "« Ne pas boire » : écris « Oui » ou laisse la case vide (et pas « {$this->text($value)} »).";
        }

        return false;
    }

    /**
     * @param  list<string>  $errors
     */
    private function aging(mixed $value, array &$errors): ?string
    {
        $key = WineSheet::normalize($this->text($value) ?? '');

        if ($key === '') {
            return null;
        }

        foreach (AgingPotential::cases() as $case) {
            if (in_array($key, [WineSheet::normalize($case->label()), WineSheet::normalize($case->value), WineSheet::normalize($case->description())], true)) {
                return $case->value;
            }
        }

        $synonyms = [
            'jeune' => AgingPotential::Early, 'boire jeune' => AgingPotential::Early,
            'moyenne' => AgingPotential::Medium, 'moyen' => AgingPotential::Medium, 'moyenne garde' => AgingPotential::Medium,
            'longue' => AgingPotential::Long,
            'tres longue' => AgingPotential::VeryLong, 'tres longue garde' => AgingPotential::VeryLong,
        ];

        if (isset($synonyms[$key])) {
            return $synonyms[$key]->value;
        }

        $choices = implode(', ', array_map(fn (AgingPotential $case) => $case->label(), AgingPotential::cases()));
        $errors[] = "Potentiel de garde « {$this->text($value)} » inconnu (choisis : {$choices}).";

        return null;
    }
}
