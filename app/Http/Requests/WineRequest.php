<?php

namespace App\Http\Requests;

use App\Enums\AgingPotential;
use App\Enums\BottleFormat;
use App\Enums\WineCategory;
use App\Http\Middleware\EnsureUserHasHousehold;
use App\Models\Household;
use App\Rules\CompartmentInHousehold;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class WineRequest extends FormRequest
{
    public const MAX_TAGS = 8;

    public const MAX_GRAPES = 6;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'tags' => self::cleanList($this->input('tags'), lowercase: true),
            'grapes' => self::cleanList($this->input('grapes')),
            'price' => self::decimal($this->input('price')),
            'value' => self::decimal($this->input('value')),
            'alcohol' => self::decimal($this->input('alcohol')),
            'remove_photo' => $this->boolean('remove_photo'),
            'keepsake' => $this->boolean('keepsake'),
        ]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $creating = $this->isMethod('post');
        $household = $this->attributes->get(EnsureUserHasHousehold::ATTRIBUTE);
        $nextYear = now()->year + 1;

        return [
            'name' => ['required', 'string', 'max:120'],
            'producer' => ['nullable', 'string', 'max:120'],
            'category' => ['required', Rule::enum(WineCategory::class)],
            'vintage' => ['nullable', 'integer', 'between:1800,'.$nextYear],
            'appellation' => ['nullable', 'string', 'max:120'],
            'region' => ['nullable', 'string', 'max:60'],
            'country' => ['nullable', 'string', 'max:60'],
            'grapes' => ['nullable', 'array', 'max:'.self::MAX_GRAPES],
            'grapes.*' => ['string', 'max:40'],
            'alcohol' => ['nullable', 'numeric', 'between:0,30'],
            'description' => ['nullable', 'string', 'max:2000'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:15360'],
            'remove_photo' => ['boolean'],
            'quantity' => [$creating ? 'required' : 'sometimes', 'integer', 'between:1,999'],
            'format' => ['required', Rule::enum(BottleFormat::class)],
            'price' => ['nullable', 'numeric', 'between:0,100000'],
            'value' => ['nullable', 'numeric', 'between:0,1000000'],
            'purchased_on' => ['nullable', 'date', 'before_or_equal:tomorrow'],
            'bought_from' => ['nullable', 'string', 'max:80'],
            'aging' => ['nullable', Rule::enum(AgingPotential::class)],
            'drink_from' => ['nullable', 'integer', 'between:1800,2300'],
            'drink_until' => ['nullable', 'integer', 'between:1800,2300', 'gte:drink_from'],
            'keepsake' => ['boolean'],
            'tags' => ['nullable', 'array', 'max:'.self::MAX_TAGS],
            'tags.*' => ['string', 'max:30'],
            'compartment_id' => ['required', 'integer', $household instanceof Household ? new CompartmentInHousehold($household) : 'prohibited'],
            'placements' => [$creating ? 'nullable' : 'prohibited', 'array', 'max:10'],
            'placements.*.compartment_id' => ['required', 'integer', $household instanceof Household ? new CompartmentInHousehold($household) : 'prohibited'],
            'placements.*.quantity' => ['required', 'integer', 'min:1'],
        ];
    }

    /**
     * The bottles put elsewhere must leave at least one in the main place.
     *
     * @return list<callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                $extra = array_sum(array_column($this->placements(), 'quantity'));

                if ($extra > 0 && $extra >= (int) $this->input('quantity')) {
                    $validator->errors()->add('placements', 'Garde au moins une bouteille au premier emplacement.');
                }
            },
        ];
    }

    /**
     * Other places where some of the bottles go (same wine, several lots).
     *
     * @return list<array{compartment_id: int, quantity: int}>
     */
    public function placements(): array
    {
        $placements = $this->input('placements');

        if (! is_array($placements)) {
            return [];
        }

        return array_values(array_filter(array_map(fn (mixed $placement) => is_array($placement) ? [
            'compartment_id' => (int) ($placement['compartment_id'] ?? 0),
            'quantity' => (int) ($placement['quantity'] ?? 0),
        ] : null, $placements)));
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nom du vin',
            'producer' => 'domaine',
            'category' => 'couleur',
            'vintage' => 'millésime',
            'grapes' => 'cépages',
            'alcohol' => 'degré',
            'photo' => 'photo',
            'quantity' => 'nombre de bouteilles',
            'format' => 'format',
            'price' => 'prix d’achat',
            'value' => 'valeur estimée',
            'purchased_on' => 'date d’achat',
            'bought_from' => 'lieu d’achat',
            'aging' => 'potentiel de garde',
            'drink_from' => 'début de la fenêtre',
            'drink_until' => 'fin de la fenêtre',
            'keepsake' => 'ne pas boire',
            'tags' => 'étiquettes',
            'compartment_id' => 'emplacement',
            'placements' => 'autres emplacements',
            'placements.*.quantity' => 'nombre de bouteilles',
            'placements.*.compartment_id' => 'emplacement',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'drink_until.gte' => 'La fin de la fenêtre doit être après son début.',
        ];
    }

    /**
     * Validated data, ready for the inventory (prices in cents).
     *
     * @return array<string, mixed>
     */
    public function wineData(): array
    {
        $data = Arr::except($this->validated(), ['photo', 'remove_photo', 'price', 'value', 'placements']);

        foreach (['price' => 'price_cents', 'value' => 'value_cents'] as $input => $column) {
            if ($this->has($input)) {
                $amount = $this->validated($input);
                $data[$column] = $amount !== null ? (int) round(((float) $amount) * 100) : null;
            }
        }

        return $data;
    }

    /**
     * @return list<string>
     */
    public static function cleanList(mixed $value, bool $lowercase = false): array
    {
        $items = is_array($value) ? $value : (is_string($value) && $value !== '' ? explode(',', $value) : []);

        $clean = [];

        foreach ($items as $item) {
            if (! is_string($item)) {
                continue;
            }

            $item = trim(ltrim(trim($item), '#'));
            $item = $lowercase ? mb_strtolower($item) : $item;

            if ($item !== '' && ! in_array(mb_strtolower($item), array_map('mb_strtolower', $clean), true)) {
                $clean[] = $item;
            }
        }

        return $clean;
    }

    private static function decimal(mixed $value): mixed
    {
        if (is_string($value)) {
            $value = trim(str_replace([' ', "\u{202F}", "\u{00A0}", '€', '%'], '', $value));

            return $value === '' ? null : str_replace(',', '.', $value);
        }

        return $value;
    }
}
