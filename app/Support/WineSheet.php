<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * The columns of the « Vins » sheet, shared by the Excel export and import.
 * Importable columns are read back; the others are only informative.
 */
final class WineSheet
{
    public const SHEET = 'Vins';

    public const HISTORY_SHEET = 'Historique';

    public const LISTS_SHEET = 'Listes';

    public const HELP_SHEET = 'Mode d’emploi';

    /**
     * @return list<array{key: string, label: string, width: int, import: bool, aliases: list<string>, money?: bool, date?: bool}>
     */
    public static function columns(bool $withPrices = true): array
    {
        $columns = [
            ['key' => 'id', 'label' => 'ID', 'width' => 8, 'import' => true, 'aliases' => ['id vinora', 'identifiant']],
            ['key' => 'name', 'label' => 'Nom', 'width' => 34, 'import' => true, 'aliases' => ['nom du vin', 'vin', 'cuvee', 'name', 'wine']],
            ['key' => 'producer', 'label' => 'Domaine', 'width' => 26, 'import' => true, 'aliases' => ['producteur', 'chateau', 'maison', 'producer']],
            ['key' => 'category', 'label' => 'Couleur', 'width' => 20, 'import' => true, 'aliases' => ['type', 'color', 'colour']],
            ['key' => 'vintage', 'label' => 'Millésime', 'width' => 11, 'import' => true, 'aliases' => ['annee', 'vintage', 'year']],
            ['key' => 'appellation', 'label' => 'Appellation', 'width' => 24, 'import' => true, 'aliases' => ['aoc', 'aop']],
            ['key' => 'region', 'label' => 'Région', 'width' => 18, 'import' => true, 'aliases' => ['region viticole']],
            ['key' => 'country', 'label' => 'Pays', 'width' => 13, 'import' => true, 'aliases' => ['country']],
            ['key' => 'grapes', 'label' => 'Cépages', 'width' => 26, 'import' => true, 'aliases' => ['cepage', 'grapes', 'grape', 'assemblage']],
            ['key' => 'alcohol', 'label' => 'Degré (%)', 'width' => 10, 'import' => true, 'aliases' => ['degre alcool', 'alcool', 'abv']],
            ['key' => 'format', 'label' => 'Format', 'width' => 16, 'import' => true, 'aliases' => ['contenance', 'taille', 'bouteille']],
            ['key' => 'quantity', 'label' => 'Quantité', 'width' => 10, 'import' => true, 'aliases' => ['quantite en cave', 'bouteilles', 'nombre', 'nb', 'qte', 'quantity', 'stock']],
            ['key' => 'cellar', 'label' => 'Cave', 'width' => 20, 'import' => true, 'aliases' => ['nom de la cave']],
            ['key' => 'compartment', 'label' => 'Clayette', 'width' => 20, 'import' => true, 'aliases' => ['emplacement', 'casier', 'rangee', 'etagere']],
        ];

        if ($withPrices) {
            $columns[] = ['key' => 'price', 'label' => 'Prix d’achat (€)', 'width' => 14, 'import' => true, 'aliases' => ['prix', 'prix achat', 'prix unitaire', 'price'], 'money' => true];
            $columns[] = ['key' => 'value', 'label' => 'Valeur estimée (€)', 'width' => 15, 'import' => true, 'aliases' => ['valeur', 'cote', 'value'], 'money' => true];
        }

        return [
            ...$columns,
            ['key' => 'purchased_on', 'label' => 'Date d’achat', 'width' => 13, 'import' => true, 'aliases' => ['achete le', 'date achat'], 'date' => true],
            ['key' => 'bought_from', 'label' => 'Lieu d’achat', 'width' => 18, 'import' => true, 'aliases' => ['achete chez', 'chez', 'fournisseur', 'caviste', 'provenance']],
            ['key' => 'aging', 'label' => 'Potentiel de garde', 'width' => 19, 'import' => true, 'aliases' => ['garde', 'potentiel']],
            ['key' => 'drink_from', 'label' => 'À boire dès', 'width' => 12, 'import' => true, 'aliases' => ['a boire a partir de', 'boire des', 'apogee debut', 'debut apogee', 'drink from']],
            ['key' => 'drink_until', 'label' => 'À boire jusqu’en', 'width' => 15, 'import' => true, 'aliases' => ['a boire avant', 'boire avant', 'jusqu en', 'apogee fin', 'fin apogee', 'drink until']],
            ['key' => 'keepsake', 'label' => 'Ne pas boire', 'width' => 12, 'import' => true, 'aliases' => ['a garder', 'garder', 'cadeau', 'souvenir', 'collection', 'ne pas ouvrir', 'keepsake']],
            ['key' => 'tags', 'label' => 'Étiquettes', 'width' => 20, 'import' => true, 'aliases' => ['tags', 'mots cles']],
            ['key' => 'description', 'label' => 'Notes', 'width' => 40, 'import' => true, 'aliases' => ['commentaire', 'commentaires', 'remarques', 'description', 'notes perso']],
            ['key' => 'window', 'label' => 'Apogée', 'width' => 22, 'import' => false, 'aliases' => []],
            ['key' => 'rating', 'label' => 'Note moyenne (/5)', 'width' => 14, 'import' => false, 'aliases' => []],
            ['key' => 'initial_quantity', 'label' => 'Quantité achetée', 'width' => 12, 'import' => false, 'aliases' => []],
            ['key' => 'status', 'label' => 'Statut', 'width' => 11, 'import' => false, 'aliases' => []],
            ['key' => 'finished_at', 'label' => 'Terminée le', 'width' => 13, 'import' => false, 'aliases' => [], 'date' => true],
            ['key' => 'created_at', 'label' => 'Rangée le', 'width' => 13, 'import' => false, 'aliases' => [], 'date' => true],
            ['key' => 'created_by', 'label' => 'Rangée par', 'width' => 13, 'import' => false, 'aliases' => []],
            ['key' => 'photo', 'label' => 'Photo', 'width' => 30, 'import' => false, 'aliases' => []],
        ];
    }

    /**
     * Header or value comparable whatever its case, accents, punctuation
     * or unit in brackets: « Prix d’achat (€) » → « prix d achat ».
     */
    public static function normalize(mixed $value): string
    {
        $text = Str::ascii(mb_strtolower(trim((string) $value)));
        $text = (string) preg_replace('/\(.*?\)/', ' ', $text);
        $text = (string) preg_replace('/[^a-z0-9]+/', ' ', $text);

        return trim((string) preg_replace('/\s+/', ' ', $text));
    }

    /**
     * Column key for a header of an imported sheet.
     */
    public static function keyForHeader(mixed $header, bool $withPrices): ?string
    {
        $normalized = self::normalize($header);

        if ($normalized === '') {
            return null;
        }

        foreach (self::columns($withPrices) as $column) {
            if (! $column['import']) {
                continue;
            }

            $names = [self::normalize($column['label']), ...array_map(fn (string $alias) => self::normalize($alias), $column['aliases'])];

            if (in_array($normalized, $names, true)) {
                return $column['key'];
            }
        }

        return null;
    }
}
