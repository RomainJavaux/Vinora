<?php

namespace App\Enums;

enum MovementType: string
{
    case Added = 'added';
    case Drunk = 'drunk';
    case Gifted = 'gifted';
    case Restocked = 'restocked';
    case Moved = 'moved';
    case Updated = 'updated';
    case Discarded = 'discarded';

    public function verb(): string
    {
        return match ($this) {
            self::Added => 'a rangé',
            self::Drunk => 'a bu',
            self::Gifted => 'a offert',
            self::Restocked => 'a rajouté',
            self::Moved => 'a déplacé',
            self::Updated => 'a modifié',
            self::Discarded => 'a jeté',
        };
    }

    /**
     * Movements that take bottles out of the cellar.
     *
     * @return list<self>
     */
    public static function outgoing(): array
    {
        return [self::Drunk, self::Gifted, self::Discarded];
    }
}
