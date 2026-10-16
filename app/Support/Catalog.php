<?php

namespace App\Support;

use App\Enums\AgingPotential;
use App\Enums\BottleFormat;
use App\Enums\CellarType;
use App\Enums\DiscardReason;
use App\Enums\HouseholdRole;
use App\Enums\WineCategory;

/**
 * Every enumeration and list of suggestions, defined once on the server and
 * shared with the interface (once per browsing session).
 */
final class Catalog
{
    /** @var list<string> */
    public const HOUSEHOLD_EMOJIS = ['🏠', '🏡', '🏢', '🏘️', '🏰', '🏔️', '🏖️', '🌲', '🛖', '⛺', '🚐', '🍇'];

    /** @var list<string> */
    public const LOCATIONS = ['Salon', 'Cuisine', 'Cave', 'Sous-sol', 'Cellier', 'Garage', 'Bureau', 'Salle à manger'];

    /**
     * Known regions, with their country and the usual bottle shape.
     *
     * @var list<array{name: string, country: string, shape: string}>
     */
    public const REGIONS = [
        ['name' => 'Bordeaux', 'country' => 'France', 'shape' => 'bordeaux'],
        ['name' => 'Bourgogne', 'country' => 'France', 'shape' => 'burgundy'],
        ['name' => 'Champagne', 'country' => 'France', 'shape' => 'champagne'],
        ['name' => 'Vallée du Rhône', 'country' => 'France', 'shape' => 'burgundy'],
        ['name' => 'Val de Loire', 'country' => 'France', 'shape' => 'burgundy'],
        ['name' => 'Alsace', 'country' => 'France', 'shape' => 'flute'],
        ['name' => 'Beaujolais', 'country' => 'France', 'shape' => 'burgundy'],
        ['name' => 'Languedoc-Roussillon', 'country' => 'France', 'shape' => 'bordeaux'],
        ['name' => 'Provence', 'country' => 'France', 'shape' => 'bordeaux'],
        ['name' => 'Sud-Ouest', 'country' => 'France', 'shape' => 'bordeaux'],
        ['name' => 'Jura', 'country' => 'France', 'shape' => 'burgundy'],
        ['name' => 'Savoie', 'country' => 'France', 'shape' => 'burgundy'],
        ['name' => 'Corse', 'country' => 'France', 'shape' => 'bordeaux'],
        ['name' => 'Toscane', 'country' => 'Italie', 'shape' => 'bordeaux'],
        ['name' => 'Piémont', 'country' => 'Italie', 'shape' => 'burgundy'],
        ['name' => 'Rioja', 'country' => 'Espagne', 'shape' => 'bordeaux'],
        ['name' => 'Ribera del Duero', 'country' => 'Espagne', 'shape' => 'bordeaux'],
        ['name' => 'Douro', 'country' => 'Portugal', 'shape' => 'bordeaux'],
        ['name' => 'Moselle', 'country' => 'Allemagne', 'shape' => 'flute'],
        ['name' => 'Napa Valley', 'country' => 'États-Unis', 'shape' => 'bordeaux'],
        ['name' => 'Mendoza', 'country' => 'Argentine', 'shape' => 'bordeaux'],
    ];

    /** @var list<string> */
    public const COUNTRIES = [
        'France', 'Italie', 'Espagne', 'Portugal', 'Allemagne', 'Autriche', 'Suisse', 'Grèce',
        'Hongrie', 'Liban', 'États-Unis', 'Argentine', 'Chili', 'Afrique du Sud', 'Australie', 'Nouvelle-Zélande',
    ];

    /** @var list<string> */
    public const GRAPES = [
        'Merlot', 'Cabernet Sauvignon', 'Cabernet Franc', 'Pinot Noir', 'Syrah', 'Grenache', 'Mourvèdre',
        'Gamay', 'Malbec', 'Carignan', 'Cinsault', 'Tannat', 'Chardonnay', 'Sauvignon Blanc', 'Chenin',
        'Riesling', 'Gewurztraminer', 'Pinot Gris', 'Viognier', 'Sémillon', 'Muscat', 'Savagnin',
        'Marsanne', 'Roussanne', 'Tempranillo', 'Sangiovese', 'Nebbiolo', 'Zinfandel',
    ];

    /** @var list<string> */
    public const BOUGHT_FROM = ['Caviste', 'Au domaine', 'Salon des vins', 'Foire aux vins', 'En ligne', 'Supermarché', 'Cadeau', 'Enchères'];

    /**
     * Food pairings: each dish gives a weight to every wine colour.
     *
     * @var list<array{value: string, label: string, emoji: string, weights: array<string, int>}>
     */
    public const DISHES = [
        ['value' => 'red_meat', 'label' => 'Viande rouge', 'emoji' => '🥩', 'weights' => ['red' => 3, 'fortified' => 0]],
        ['value' => 'poultry', 'label' => 'Volaille', 'emoji' => '🍗', 'weights' => ['white' => 2, 'red' => 2, 'rose' => 1, 'orange' => 1]],
        ['value' => 'fish', 'label' => 'Poisson', 'emoji' => '🐟', 'weights' => ['white' => 3, 'sparkling' => 1, 'rose' => 1]],
        ['value' => 'seafood', 'label' => 'Fruits de mer', 'emoji' => '🦪', 'weights' => ['white' => 3, 'sparkling' => 2]],
        ['value' => 'cheese', 'label' => 'Fromages', 'emoji' => '🧀', 'weights' => ['red' => 2, 'white' => 2, 'sweet' => 2, 'fortified' => 1, 'orange' => 1]],
        ['value' => 'grill', 'label' => 'Grillades', 'emoji' => '🔥', 'weights' => ['red' => 3, 'rose' => 2]],
        ['value' => 'veggie', 'label' => 'Végétarien', 'emoji' => '🥗', 'weights' => ['white' => 2, 'rose' => 2, 'orange' => 2, 'red' => 1]],
        ['value' => 'spicy', 'label' => 'Épicé', 'emoji' => '🌶️', 'weights' => ['white' => 2, 'rose' => 2, 'sweet' => 1, 'orange' => 1]],
        ['value' => 'aperitif', 'label' => 'Apéro', 'emoji' => '🫒', 'weights' => ['sparkling' => 3, 'rose' => 2, 'white' => 2]],
        ['value' => 'dessert', 'label' => 'Dessert', 'emoji' => '🍰', 'weights' => ['sweet' => 3, 'fortified' => 2, 'sparkling' => 1]],
    ];

    /**
     * Name ideas for compartments, by cellar type.
     *
     * @var array<string, list<string>>
     */
    public const COMPARTMENT_SUGGESTIONS = [
        'default' => ['Rouges', 'Blancs', 'Bulles', 'Rosés', 'Bordeaux', 'Bourgogne', 'Rhône', 'Loire', 'Grands crus', 'À boire', 'Garde', 'Magnums', 'Cadeaux', 'Divers'],
    ];

    /**
     * @return array<string, mixed>
     */
    public static function toArray(): array
    {
        return [
            'categories' => array_map(fn (WineCategory $category) => [
                'value' => $category->value,
                'label' => $category->label(),
                'short' => $category->shortLabel(),
                'emoji' => $category->emoji(),
                'color' => $category->color(),
                'glass' => $category->glass(),
                'liquid' => $category->liquid(),
                'capsule' => $category->capsule(),
                'serving' => $category->servingTemperature(),
                'servingTip' => $category->servingTip(),
                'aging' => $category->defaultAging()?->value,
            ], WineCategory::cases()),
            'formats' => array_map(fn (BottleFormat $format) => [
                'value' => $format->value,
                'label' => $format->label(),
                'volume' => $format->volume(),
                'ml' => $format->milliliters(),
                'singular' => $format->singular(),
                'plural' => $format->plural(),
            ], BottleFormat::cases()),
            'cellarTypes' => array_map(fn (CellarType $type) => [
                'value' => $type->value,
                'label' => $type->label(),
                'short' => $type->shortLabel(),
                'description' => $type->description(),
                'compartment' => $type->compartmentLabel(),
                'compartmentPlural' => $type->compartmentPlural(),
                'defaultCount' => $type->defaultCompartments(),
                'max' => $type->maxCompartments(),
                'defaultCapacity' => $type->defaultCapacity(),
                'maxCapacity' => $type->maxCapacity(),
                'temperature' => $type->defaultTemperature(),
                'maxDepth' => $type->maxDepth(),
            ], CellarType::cases()),
            'agings' => array_map(fn (AgingPotential $aging) => [
                'value' => $aging->value,
                'label' => $aging->label(),
                'description' => $aging->description(),
                'emoji' => $aging->emoji(),
                'from' => $aging->startOffset(),
                'until' => $aging->endOffset(),
            ], AgingPotential::cases()),
            'roles' => array_map(fn (HouseholdRole $role) => [
                'value' => $role->value,
                'label' => $role->label(),
                'description' => $role->description(),
            ], HouseholdRole::cases()),
            'discardReasons' => array_map(fn (DiscardReason $reason) => [
                'value' => $reason->value,
                'label' => $reason->label(),
                'emoji' => $reason->emoji(),
            ], DiscardReason::cases()),
            'palette' => Palette::options(),
            'householdEmojis' => self::HOUSEHOLD_EMOJIS,
            'locations' => self::LOCATIONS,
            'regions' => self::REGIONS,
            'countries' => self::COUNTRIES,
            'grapes' => self::GRAPES,
            'boughtFrom' => self::BOUGHT_FROM,
            'dishes' => self::DISHES,
            'compartmentSuggestions' => self::COMPARTMENT_SUGGESTIONS['default'],
        ];
    }
}
