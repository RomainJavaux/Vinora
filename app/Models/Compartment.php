<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A shelf (clayette), a rack row or a bin of a cellar.
 *
 * @property int $id
 * @property int $cellar_id
 * @property string $name
 * @property string|null $color
 * @property int|null $capacity
 * @property int $position
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read Cellar $cellar
 */
#[Fillable(['cellar_id', 'name', 'color', 'capacity', 'position'])]
class Compartment extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'capacity' => 'integer',
            'position' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Cellar, $this>
     */
    public function cellar(): BelongsTo
    {
        return $this->belongsTo(Cellar::class);
    }

    /**
     * @return HasMany<Wine, $this>
     */
    public function wines(): HasMany
    {
        return $this->hasMany(Wine::class);
    }
}
