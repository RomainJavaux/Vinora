<?php

namespace App\Http\Requests;

use App\Enums\CellarType;
use App\Support\Palette;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CellarRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return self::rulesFor('', $this->input('type'));
    }

    /**
     * Rules for a cellar, optionally nested under a prefix (onboarding).
     *
     * @return array<string, array<mixed>>
     */
    public static function rulesFor(string $prefix, mixed $type, bool $required = true): array
    {
        $type = is_string($type) ? CellarType::tryFrom($type) : null;
        $max = $type?->maxCompartments() ?? 16;
        $maxCapacity = $type?->maxCapacity() ?? 300;
        $presence = $required ? 'required' : "required_with:{$prefix}name";

        return [
            "{$prefix}name" => [$presence, 'string', 'max:60'],
            "{$prefix}type" => [$presence, Rule::enum(CellarType::class)],
            "{$prefix}color" => [$presence, Rule::in(Palette::keys())],
            "{$prefix}location" => ['nullable', 'string', 'max:60'],
            "{$prefix}notes" => ['nullable', 'string', 'max:1000'],
            "{$prefix}temperature" => ['nullable', 'numeric', 'between:-5,30'],
            "{$prefix}humidity" => ['nullable', 'integer', 'between:0,100'],
            "{$prefix}depth" => ['nullable', 'integer', 'between:1,'.($type?->maxDepth() ?? 4)],
            "{$prefix}compartments" => [$presence, 'array', 'min:1', "max:{$max}"],
            "{$prefix}compartments.*.id" => ['nullable', 'integer'],
            "{$prefix}compartments.*.name" => ['required', 'string', 'max:40'],
            "{$prefix}compartments.*.color" => ['nullable', Rule::in(Palette::keys())],
            "{$prefix}compartments.*.capacity" => ['nullable', 'integer', 'min:1', "max:{$maxCapacity}"],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'compartments' => 'compartiments',
            'compartments.*.name' => 'nom du compartiment',
            'compartments.*.capacity' => 'nombre de places',
        ];
    }
}
