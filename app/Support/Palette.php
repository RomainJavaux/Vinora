<?php

namespace App\Support;

/**
 * Personalisation palette used for households and cellars. Each colour is
 * always displayed as a 135° gradient going from "from" to "to".
 */
final class Palette
{
    public const DEFAULT = 'bordeaux';

    /**
     * @var array<string, array{label: string, from: string, to: string}>
     */
    public const COLORS = [
        'bordeaux' => ['label' => 'Bordeaux', 'from' => '#fb7185', 'to' => '#881337'],
        'gold' => ['label' => 'Or', 'from' => '#fde68a', 'to' => '#d97706'],
        'oak' => ['label' => 'Chêne', 'from' => '#f0c99a', 'to' => '#8a4b20'],
        'vine' => ['label' => 'Vigne', 'from' => '#bef264', 'to' => '#3f6212'],
        'plum' => ['label' => 'Prune', 'from' => '#e9a8f5', 'to' => '#6b21a8'],
        'rose' => ['label' => 'Rosé', 'from' => '#fecdd3', 'to' => '#e11d48'],
        'slate' => ['label' => 'Ardoise', 'from' => '#cbd5e1', 'to' => '#475569'],
        'night' => ['label' => 'Nuit', 'from' => '#a5b4fc', 'to' => '#312e81'],
    ];

    /**
     * @return list<string>
     */
    public static function keys(): array
    {
        return array_keys(self::COLORS);
    }

    /**
     * @return list<array{value: string, label: string, from: string, to: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (string $key, array $color) => ['value' => $key, ...$color],
            array_keys(self::COLORS),
            self::COLORS,
        );
    }
}
