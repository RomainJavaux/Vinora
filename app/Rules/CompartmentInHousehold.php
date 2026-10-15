<?php

namespace App\Rules;

use App\Models\Household;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * The compartment must belong to a cellar of the given household.
 */
class CompartmentInHousehold implements ValidationRule
{
    public function __construct(private readonly Household $household) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_numeric($value) || ! in_array((int) $value, $this->household->compartmentIds(), true)) {
            $fail('Choisis un emplacement dans une de tes caves.');
        }
    }
}
