<?php

namespace App\Support;

use App\Models\Household;
use App\Models\Wine;
use Illuminate\Support\Collection;

/**
 * What the household already typed in its wine records (estates,
 * appellations, wine shops, tags…), most used first, to suggest it again
 * instead of typing it every time.
 *
 * @phpstan-type KnownValue array{value: string, count: int, region: string|null, country: string|null}
 */
final class KnownValues
{
    private const LIMIT = 150;

    /**
     * @return array{producers: list<KnownValue>, appellations: list<KnownValue>, regions: list<KnownValue>, countries: list<KnownValue>, boughtFrom: list<KnownValue>, tags: list<KnownValue>, grapes: list<KnownValue>}
     */
    public static function for(Household $household): array
    {
        /** @var Collection<int, Wine> $wines */
        $wines = $household->wines()->get(['id', 'producer', 'appellation', 'region', 'country', 'bought_from', 'tags', 'grapes']);

        $pick = fn (string $field) => $wines->map(fn (Wine $wine) => [
            'value' => $wine->getAttribute($field),
            'region' => $wine->region,
            'country' => $wine->country,
        ]);
        $spread = fn (string $field) => $wines->flatMap(fn (Wine $wine) => array_map(fn (string $value) => [
            'value' => $value,
            'region' => null,
            'country' => null,
        ], (array) $wine->getAttribute($field)));

        return [
            'producers' => self::rank($pick('producer'), withPlace: true),
            'appellations' => self::rank($pick('appellation'), withPlace: true),
            'regions' => self::rank($wines->map(fn (Wine $wine) => [
                'value' => $wine->region,
                'region' => null,
                'country' => $wine->country,
            ]), withPlace: true),
            'countries' => self::rank($pick('country')),
            'boughtFrom' => self::rank($pick('bought_from')),
            'tags' => self::rank($spread('tags')),
            'grapes' => self::rank($spread('grapes')),
        ];
    }

    /**
     * Group the values whatever their case, keep the most common spelling
     * and, for places, the region and country they usually go with.
     *
     * @param  iterable<array{value: mixed, region: string|null, country: string|null}>  $entries
     * @return list<KnownValue>
     */
    private static function rank(iterable $entries, bool $withPlace = false): array
    {
        return array_values(collect($entries)
            ->filter(fn (array $entry) => is_string($entry['value']) && trim($entry['value']) !== '')
            ->groupBy(fn (array $entry) => mb_strtolower(trim((string) $entry['value'])))
            ->map(fn (Collection $group) => [
                'value' => self::mostCommon($group->map(fn (array $entry) => trim((string) $entry['value']))) ?? '',
                'count' => $group->count(),
                'region' => $withPlace ? self::mostCommon($group->pluck('region')) : null,
                'country' => $withPlace ? self::mostCommon($group->pluck('country')) : null,
            ])
            ->sortBy([
                fn (array $a, array $b) => $b['count'] <=> $a['count'],
                fn (array $a, array $b) => strcmp(mb_strtolower($a['value']), mb_strtolower($b['value'])),
            ])
            ->take(self::LIMIT)
            ->all());
    }

    /**
     * @param  Collection<int, mixed>  $values
     */
    private static function mostCommon(Collection $values): ?string
    {
        $counts = $values
            ->filter(fn (mixed $value) => is_string($value) && trim($value) !== '')
            ->countBy(fn (mixed $value) => trim((string) $value));

        return $counts->isEmpty() ? null : (string) $counts->sortDesc()->keys()->first();
    }
}
