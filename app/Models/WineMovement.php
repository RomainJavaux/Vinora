<?php

namespace App\Models;

use App\Enums\MovementType;
use App\Enums\WineCategory;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Immutable journal of everything that enters and leaves the cellars. The
 * name, vintage and colour of the wine are copied so the history survives
 * the deletion of the wine.
 *
 * @property int $id
 * @property int $household_id
 * @property int|null $wine_id
 * @property int|null $user_id
 * @property MovementType $type
 * @property string $wine_name
 * @property int|null $wine_vintage
 * @property WineCategory $wine_category
 * @property int|null $quantity
 * @property int|null $from_compartment_id
 * @property int|null $to_compartment_id
 * @property int|null $rating
 * @property string|null $note
 * @property CarbonImmutable|null $created_at
 * @property-read Wine|null $wine
 * @property-read User|null $user
 * @property-read Compartment|null $fromCompartment
 * @property-read Compartment|null $toCompartment
 */
#[Fillable([
    'household_id', 'wine_id', 'user_id', 'type', 'wine_name', 'wine_vintage', 'wine_category', 'quantity',
    'from_compartment_id', 'to_compartment_id', 'rating', 'note', 'created_at',
])]
class WineMovement extends Model
{
    public const UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => MovementType::class,
            'wine_category' => WineCategory::class,
            'wine_vintage' => 'integer',
            'quantity' => 'integer',
            'rating' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Wine, $this>
     */
    public function wine(): BelongsTo
    {
        return $this->belongsTo(Wine::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Compartment, $this>
     */
    public function fromCompartment(): BelongsTo
    {
        return $this->belongsTo(Compartment::class, 'from_compartment_id');
    }

    /**
     * @return BelongsTo<Compartment, $this>
     */
    public function toCompartment(): BelongsTo
    {
        return $this->belongsTo(Compartment::class, 'to_compartment_id');
    }
}
