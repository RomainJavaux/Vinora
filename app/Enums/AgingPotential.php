<?php

namespace App\Enums;

/**
 * How long a wine is meant to be kept. Each potential is a window of years
 * counted from the vintage (or from the purchase year for non-vintage wines).
 */
enum AgingPotential: string
{
    case Early = 'early';
    case Medium = 'medium';
    case Long = 'long';
    case VeryLong = 'very_long';

    public function label(): string
    {
        return match ($this) {
            self::Early => 'À boire jeune',
            self::Medium => 'Garde moyenne',
            self::Long => 'Longue garde',
            self::VeryLong => 'Très longue garde',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Early => 'Dans les 3 ans',
            self::Medium => 'De 3 à 8 ans',
            self::Long => 'De 6 à 15 ans',
            self::VeryLong => 'De 10 à 30 ans et plus',
        };
    }

    public function emoji(): string
    {
        return match ($this) {
            self::Early => '🌱',
            self::Medium => '🍇',
            self::Long => '🛢️',
            self::VeryLong => '🏰',
        };
    }

    /** Years after the vintage when the wine starts being ready. */
    public function startOffset(): int
    {
        return match ($this) {
            self::Early => 0,
            self::Medium => 3,
            self::Long => 6,
            self::VeryLong => 10,
        };
    }

    /** Years after the vintage when the wine should have been drunk. */
    public function endOffset(): int
    {
        return match ($this) {
            self::Early => 3,
            self::Medium => 8,
            self::Long => 15,
            self::VeryLong => 30,
        };
    }
}
