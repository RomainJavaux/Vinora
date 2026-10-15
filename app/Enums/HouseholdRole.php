<?php

namespace App\Enums;

enum HouseholdRole: string
{
    case Owner = 'owner';
    case Admin = 'admin';
    case Member = 'member';

    public function label(): string
    {
        return match ($this) {
            self::Owner => 'Propriétaire',
            self::Admin => 'Admin',
            self::Member => 'Membre',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Owner => 'Peut tout faire, y compris supprimer le lieu.',
            self::Admin => 'Peut modifier le lieu, inviter et gérer les membres.',
            self::Member => 'Peut ranger, boire, déplacer et configurer les caves.',
        };
    }

    public function canManage(): bool
    {
        return $this === self::Owner || $this === self::Admin;
    }

    /**
     * Roles that can be given through an invitation or a role change.
     *
     * @return list<self>
     */
    public static function assignable(): array
    {
        return [self::Admin, self::Member];
    }
}
