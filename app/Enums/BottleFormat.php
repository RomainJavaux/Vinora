<?php

namespace App\Enums;

enum BottleFormat: string
{
    case Half = 'half';
    case Medium = 'medium';
    case Clavelin = 'clavelin';
    case Standard = 'standard';
    case Liter = 'liter';
    case Magnum = 'magnum';
    case Jeroboam = 'jeroboam';

    public function label(): string
    {
        return match ($this) {
            self::Half => 'Demi-bouteille',
            self::Medium => 'Bouteille 50 cl',
            self::Clavelin => 'Clavelin',
            self::Standard => 'Bouteille',
            self::Liter => 'Litre',
            self::Magnum => 'Magnum',
            self::Jeroboam => 'Jéroboam',
        };
    }

    public function volume(): string
    {
        return match ($this) {
            self::Half => '37,5 cl',
            self::Medium => '50 cl',
            self::Clavelin => '62 cl',
            self::Standard => '75 cl',
            self::Liter => '1 l',
            self::Magnum => '1,5 l',
            self::Jeroboam => '3 l',
        };
    }

    public function milliliters(): int
    {
        return match ($this) {
            self::Half => 375,
            self::Medium => 500,
            self::Clavelin => 620,
            self::Standard => 750,
            self::Liter => 1000,
            self::Magnum => 1500,
            self::Jeroboam => 3000,
        };
    }

    public function singular(): string
    {
        return match ($this) {
            self::Half => 'demi-bouteille',
            self::Medium, self::Standard => 'bouteille',
            self::Liter => 'litre',
            self::Clavelin => 'clavelin',
            self::Magnum => 'magnum',
            self::Jeroboam => 'jéroboam',
        };
    }

    public function plural(): string
    {
        return match ($this) {
            self::Half => 'demi-bouteilles',
            self::Medium, self::Standard => 'bouteilles',
            self::Liter => 'litres',
            self::Clavelin => 'clavelins',
            self::Magnum => 'magnums',
            self::Jeroboam => 'jéroboams',
        };
    }

    public function format(int $quantity): string
    {
        return $quantity.' '.($quantity > 1 ? $this->plural() : $this->singular());
    }
}
