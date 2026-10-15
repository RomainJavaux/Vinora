<?php

namespace App\Enums;

enum DiscardReason: string
{
    case Corked = 'corked';
    case Oxidized = 'oxidized';
    case Broken = 'broken';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Corked => 'Bouchonné',
            self::Oxidized => 'Oxydé ou passé',
            self::Broken => 'Bouteille cassée',
            self::Other => 'Autre',
        };
    }

    public function emoji(): string
    {
        return match ($this) {
            self::Corked => '🤢',
            self::Oxidized => '🍂',
            self::Broken => '💥',
            self::Other => '🤷',
        };
    }
}
