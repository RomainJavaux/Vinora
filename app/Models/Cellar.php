<?php

namespace App\Models;

use App\Enums\CellarType;
use Carbon\CarbonImmutable;
use Database\Factories\CellarFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

/**
 * A cellar: an ageing cabinet, a service fridge, a wall rack or a vault.
 *
 * @property int $id
 * @property int $household_id
 * @property string $name
 * @property CellarType $type
 * @property string $color
 * @property string|null $location
 * @property string|null $notes
 * @property float|null $temperature
 * @property int|null $humidity
 * @property int $position
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read Household $household
 */
#[Fillable(['household_id', 'name', 'type', 'color', 'location', 'notes', 'temperature', 'humidity', 'position'])]
class Cellar extends Model
{
    /** @use HasFactory<CellarFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => CellarType::class,
            'temperature' => 'float',
            'humidity' => 'integer',
            'position' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Household, $this>
     */
    public function household(): BelongsTo
    {
        return $this->belongsTo(Household::class);
    }

    /**
     * @return HasMany<Compartment, $this>
     */
    public function compartments(): HasMany
    {
        return $this->hasMany(Compartment::class)->orderBy('position')->orderBy('id');
    }

    /**
     * @return HasManyThrough<Wine, Compartment, $this>
     */
    public function wines(): HasManyThrough
    {
        return $this->hasManyThrough(Wine::class, Compartment::class);
    }
}
