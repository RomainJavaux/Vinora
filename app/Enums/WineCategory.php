<?php

namespace App\Enums;

enum WineCategory: string
{
    case Red = 'red';
    case White = 'white';
    case Rose = 'rose';
    case Sparkling = 'sparkling';
    case Sweet = 'sweet';
    case Fortified = 'fortified';
    case Orange = 'orange';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Red => 'Rouge',
            self::White => 'Blanc',
            self::Rose => 'Rosé',
            self::Sparkling => 'Effervescent',
            self::Sweet => 'Moelleux & liquoreux',
            self::Fortified => 'Muté & fortifié',
            self::Orange => 'Orange',
            self::Other => 'Autre',
        };
    }

    public function shortLabel(): string
    {
        return match ($this) {
            self::Sweet => 'Liquoreux',
            self::Fortified => 'Muté',
            self::Sparkling => 'Bulles',
            default => $this->label(),
        };
    }

    public function emoji(): string
    {
        return match ($this) {
            self::Red => '🍷',
            self::White => '🥂',
            self::Rose => '🌸',
            self::Sparkling => '🍾',
            self::Sweet => '🍯',
            self::Fortified => '🥃',
            self::Orange => '🍊',
            self::Other => '🍶',
        };
    }

    /** Tint used for tiles, chips and progress bars. */
    public function color(): string
    {
        return match ($this) {
            self::Red => '#9f1239',
            self::White => '#ca8a04',
            self::Rose => '#ec4899',
            self::Sparkling => '#d4a017',
            self::Sweet => '#d97706',
            self::Fortified => '#92400e',
            self::Orange => '#ea580c',
            self::Other => '#64748b',
        };
    }

    /** Colour of the glass of the bottle in the illustrations. */
    public function glass(): string
    {
        return match ($this) {
            self::Red, self::Fortified => '#2a1215',
            self::White => '#a3b18a',
            self::Rose, self::Orange, self::Sweet => '#f4efe6',
            self::Sparkling => '#1f3a2b',
            self::Other => '#94a3b8',
        };
    }

    /** Colour of the wine itself (visible through clear glass, on the dots). */
    public function liquid(): string
    {
        return match ($this) {
            self::Red => '#7f1d2d',
            self::White => '#e9d27a',
            self::Rose => '#f6a5b8',
            self::Sparkling => '#ead68a',
            self::Sweet => '#e2a23b',
            self::Fortified => '#7a2e12',
            self::Orange => '#e8913a',
            self::Other => '#cbd5e1',
        };
    }

    /** Colour of the capsule. */
    public function capsule(): string
    {
        return match ($this) {
            self::Red => '#7f1d1d',
            self::White => '#d4b45a',
            self::Rose => '#f472b6',
            self::Sparkling => '#d6b25e',
            self::Sweet => '#b45309',
            self::Fortified => '#451a03',
            self::Orange => '#c2410c',
            self::Other => '#475569',
        };
    }

    /**
     * Serving temperature range, in °C.
     *
     * @return array{0: int, 1: int}|null
     */
    public function servingTemperature(): ?array
    {
        return match ($this) {
            self::Red => [15, 18],
            self::White => [10, 12],
            self::Rose => [8, 10],
            self::Sparkling => [6, 8],
            self::Sweet => [8, 10],
            self::Fortified => [12, 16],
            self::Orange => [12, 14],
            self::Other => null,
        };
    }

    public function servingTip(): ?string
    {
        return match ($this) {
            self::Red => 'Les vins de garde aiment être carafés une heure avant le repas.',
            self::White => 'Sors-le du frigo un quart d’heure avant de le servir.',
            self::Rose => 'Bien frais, mais pas glacé.',
            self::Sparkling => 'Ouvre-le en tenant le bouchon et en tournant la bouteille.',
            self::Sweet => 'Un petit verre suffit : il se garde quelques jours une fois ouvert.',
            self::Fortified => 'Une fois ouvert, il se garde plusieurs semaines.',
            self::Orange => 'Sers-le comme un rouge léger, dans un grand verre.',
            self::Other => null,
        };
    }

    public function defaultAging(): ?AgingPotential
    {
        return match ($this) {
            self::Red => AgingPotential::Medium,
            self::White, self::Rose, self::Sparkling, self::Orange => AgingPotential::Early,
            self::Sweet => AgingPotential::Long,
            self::Fortified => AgingPotential::VeryLong,
            self::Other => null,
        };
    }
}
