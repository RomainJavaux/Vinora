<?php

namespace Database\Seeders;

use App\Actions\Cellars\SaveCellar;
use App\Actions\Households\CreateHousehold;
use App\Enums\DiscardReason;
use App\Enums\HouseholdRole;
use App\Models\Cellar;
use App\Models\Household;
use App\Models\User;
use App\Models\Wine;
use App\Services\Inventory;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Local demonstration data: a household with three cellars and about thirty
 * realistic wines, some ready, some too young, some past their window.
 */
class DemoSeeder extends Seeder
{
    private Inventory $inventory;

    /** @var array<string, int> */
    private array $compartments = [];

    public function run(Inventory $inventory, CreateHousehold $createHousehold, SaveCellar $saveCellar): void
    {
        $this->inventory = $inventory;
        $today = CarbonImmutable::now();

        $romain = User::query()->create([
            'name' => 'Romain',
            'email' => 'test@example.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);

        $camille = User::query()->create([
            'name' => 'Camille',
            'email' => 'camille@example.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);

        $home = $this->at($today->subMonths(8), fn () => $createHousehold->handle($romain, [
            'name' => 'La maison',
            'emoji' => '🏡',
            'color' => 'bordeaux',
        ]));
        $home->members()->attach($camille->id, ['role' => HouseholdRole::Admin->value]);
        $camille->switchHousehold($home);

        $cabinet = $saveCellar->handle($home, [
            'name' => 'Cave du salon',
            'type' => 'cabinet',
            'color' => 'bordeaux',
            'location' => 'Salon',
            'temperature' => 12,
            'humidity' => 68,
            'compartments' => [
                ['name' => 'Grands bordeaux', 'capacity' => 8],
                ['name' => 'Bourgognes', 'capacity' => 8],
                ['name' => 'Rhône & Sud', 'capacity' => 8],
                ['name' => 'Blancs', 'capacity' => 8],
                ['name' => 'Bulles', 'capacity' => 8],
                ['name' => 'Magnums', 'capacity' => 4],
            ],
        ]);

        $vault = $saveCellar->handle($home, [
            'name' => 'Cave voûtée',
            'type' => 'vault',
            'color' => 'oak',
            'location' => 'Sous-sol',
            'temperature' => 13,
            'humidity' => 78,
            'notes' => 'Le casier du fond est le plus frais : idéal pour les longues gardes.',
            'compartments' => [
                ['name' => 'Garde longue', 'capacity' => 24],
                ['name' => 'Bordeaux', 'capacity' => 24],
                ['name' => 'Loire & Alsace', 'capacity' => 24],
                ['name' => 'Liquoreux', 'capacity' => 24],
                ['name' => 'Cartons', 'capacity' => 36],
                ['name' => 'Étranger', 'capacity' => 24],
            ],
        ]);

        $service = $saveCellar->handle($home, [
            'name' => 'Cave de service',
            'type' => 'service',
            'color' => 'gold',
            'location' => 'Cuisine',
            'temperature' => 9,
            'compartments' => [
                ['name' => 'Bulles & blancs', 'capacity' => 6],
                ['name' => 'Rosés', 'capacity' => 6],
                ['name' => 'Rouges du moment', 'capacity' => 6],
            ],
        ]);

        $this->index($cabinet);
        $this->index($vault);
        $this->index($service);

        $members = [$romain, $camille];

        foreach ($this->wines() as $index => $row) {
            $daysAgo = $row['days'];
            $author = $members[$index % 2];

            $wine = $this->at($today->subDays($daysAgo), fn () => $this->inventory->add($home, $author, [
                'name' => $row['name'],
                'producer' => $row['producer'] ?? null,
                'category' => $row['category'],
                'vintage' => $row['vintage'] ?? null,
                'appellation' => $row['appellation'] ?? null,
                'region' => $row['region'] ?? null,
                'country' => $row['country'] ?? 'France',
                'grapes' => $row['grapes'] ?? [],
                'alcohol' => $row['alcohol'] ?? null,
                'description' => $row['description'] ?? null,
                'quantity' => $row['quantity'],
                'format' => $row['format'] ?? 'standard',
                'price_cents' => isset($row['price']) ? $row['price'] * 100 : null,
                'value_cents' => isset($row['value']) ? $row['value'] * 100 : null,
                'purchased_on' => $today->subDays($daysAgo)->toDateString(),
                'bought_from' => $row['from'] ?? 'Caviste',
                'aging' => $row['aging'],
                'drink_from' => $row['window'][0],
                'drink_until' => $row['window'][1],
                'tags' => $row['tags'] ?? [],
                'compartment_id' => $this->compartments[$row['place']],
            ]));

            foreach ($row['drunk'] ?? [] as $step => $tasting) {
                $this->at($today->subDays(max(1, $daysAgo - 20 - $step * 17)), fn () => $this->inventory->drink(
                    $wine,
                    $members[($index + $step + 1) % 2],
                    $tasting['quantity'] ?? 1,
                    $tasting['rating'] ?? null,
                    $tasting['note'] ?? null,
                ));
            }

            if (isset($row['gift'])) {
                $this->at($today->subDays(max(1, $daysAgo - 9)), fn () => $this->inventory->gift($wine->refresh(), $romain, 1, $row['gift']));
            }

            if (isset($row['discard'])) {
                $this->at($today->subDays(max(1, $daysAgo - 5)), fn () => $this->inventory->discard($wine->refresh(), $camille, DiscardReason::from($row['discard'])));
            }
        }

        // A move between cellars: two bottles brought to the service cellar.
        $chateauneuf = Wine::query()->where('name', 'like', 'Châteauneuf%')->first();

        if ($chateauneuf !== null) {
            $this->at($today->subDays(3), fn () => $this->inventory->move($chateauneuf, $camille, $this->compartments['service:Rouges du moment'], 2));
        }

        $this->countryHouse($romain, $createHousehold, $saveCellar, $today);
    }

    private function countryHouse(User $owner, CreateHousehold $createHousehold, SaveCellar $saveCellar, CarbonImmutable $today): void
    {
        $house = $createHousehold->handle($owner, [
            'name' => 'La maison de campagne',
            'emoji' => '🌲',
            'color' => 'vine',
        ]);

        $rack = $saveCellar->handle($house, [
            'name' => 'Casier du cellier',
            'type' => 'rack',
            'color' => 'oak',
            'location' => 'Cellier',
            'compartments' => [
                ['name' => 'Rangée du haut', 'capacity' => 6],
                ['name' => 'Rangée du milieu', 'capacity' => 6],
                ['name' => 'Rangée du bas', 'capacity' => 6],
            ],
        ]);

        $rows = $rack->compartments()->pluck('id')->all();

        $this->inventory->add($house, $owner, [
            'name' => 'Côtes du Rhône', 'producer' => 'Domaine de la Janasse', 'category' => 'red', 'vintage' => 2022,
            'region' => 'Vallée du Rhône', 'country' => 'France', 'grapes' => ['Grenache', 'Syrah'], 'quantity' => 6,
            'format' => 'standard', 'aging' => 'early', 'drink_from' => 2023, 'drink_until' => 2027, 'compartment_id' => $rows[0],
            'price_cents' => 1250,
        ]);

        $this->inventory->add($house, $owner, [
            'name' => 'Muscadet Sèvre-et-Maine', 'producer' => 'Domaine de l’Écu', 'category' => 'white', 'vintage' => 2023,
            'region' => 'Val de Loire', 'country' => 'France', 'grapes' => ['Melon de Bourgogne'], 'quantity' => 4,
            'format' => 'standard', 'aging' => 'early', 'drink_from' => 2024, 'drink_until' => 2027, 'compartment_id' => $rows[1],
            'price_cents' => 1400,
        ]);

        $owner->switchHousehold(Household::query()->where('name', 'La maison')->firstOrFail());
    }

    private function index(Cellar $cellar): void
    {
        $key = match ($cellar->type->value) {
            'cabinet' => 'cabinet',
            'vault' => 'vault',
            default => 'service',
        };

        foreach ($cellar->compartments()->get() as $compartment) {
            $this->compartments["{$key}:{$compartment->name}"] = $compartment->id;
        }
    }

    /**
     * Run the callback as if it happened on the given day.
     *
     * @template T
     *
     * @param  callable(): T  $callback
     * @return T
     */
    private function at(CarbonImmutable $date, callable $callback): mixed
    {
        $moment = $date->setTime(random_int(11, 21), random_int(0, 59));

        Carbon::setTestNow($moment);
        CarbonImmutable::setTestNow($moment);

        try {
            return $callback();
        } finally {
            Carbon::setTestNow();
            CarbonImmutable::setTestNow();
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function wines(): array
    {
        return [
            [
                'name' => 'Château Pichon Baron', 'category' => 'red', 'vintage' => 2016, 'appellation' => 'Pauillac', 'region' => 'Bordeaux',
                'grapes' => ['Cabernet Sauvignon', 'Merlot'], 'alcohol' => 13.5, 'quantity' => 6, 'price' => 95, 'value' => 120, 'aging' => 'long',
                'window' => [2024, 2036], 'place' => 'cabinet:Grands bordeaux', 'days' => 230, 'tags' => ['garde', 'grand cru classé'],
                'description' => 'Acheté en primeur. Carafer deux heures, il se révèle sur la truffe et le cassis.',
                'drunk' => [['rating' => 5, 'note' => 'Immense. Tanins fondus, finale interminable. Avec le gigot de Pâques.'], ['rating' => 4, 'note' => 'Encore un peu serré, laisser respirer.']],
            ],
            [
                'name' => 'Château Lynch-Bages', 'category' => 'red', 'vintage' => 2019, 'appellation' => 'Pauillac', 'region' => 'Bordeaux',
                'grapes' => ['Cabernet Sauvignon', 'Merlot', 'Cabernet Franc'], 'alcohol' => 14, 'quantity' => 3, 'price' => 110, 'aging' => 'long',
                'window' => [2028, 2042], 'place' => 'cabinet:Grands bordeaux', 'days' => 160, 'tags' => ['patience'],
            ],
            [
                'name' => 'Château Meyney', 'category' => 'red', 'vintage' => 2015, 'appellation' => 'Saint-Estèphe', 'region' => 'Bordeaux',
                'grapes' => ['Merlot', 'Cabernet Sauvignon', 'Petit Verdot'], 'quantity' => 6, 'price' => 32, 'aging' => 'medium',
                'window' => [2020, 2026], 'place' => 'cabinet:Grands bordeaux', 'days' => 220,
                'drunk' => [['quantity' => 2, 'rating' => 4, 'note' => 'Bel équilibre, à boire maintenant.'], ['quantity' => 2]],
            ],
            [
                'name' => 'Château Beaumont', 'category' => 'red', 'vintage' => 2012, 'appellation' => 'Haut-Médoc', 'region' => 'Bordeaux',
                'grapes' => ['Cabernet Sauvignon', 'Merlot'], 'quantity' => 2, 'price' => 14, 'aging' => 'medium',
                'window' => [2015, 2022], 'place' => 'vault:Bordeaux', 'days' => 240, 'description' => 'Oublié au fond du casier…',
            ],
            [
                'name' => 'Gevrey-Chambertin Vieilles Vignes', 'producer' => 'Domaine Rossignol-Trapet', 'category' => 'red', 'vintage' => 2020,
                'region' => 'Bourgogne', 'grapes' => ['Pinot Noir'], 'alcohol' => 13, 'quantity' => 3, 'price' => 58, 'aging' => 'medium',
                'window' => [2024, 2032], 'place' => 'cabinet:Bourgognes', 'days' => 140, 'tags' => ['bio'],
            ],
            [
                'name' => 'Puligny-Montrachet 1er Cru Les Pucelles', 'producer' => 'Domaine Leflaive', 'category' => 'white', 'vintage' => 2020,
                'region' => 'Bourgogne', 'grapes' => ['Chardonnay'], 'quantity' => 2, 'price' => 210, 'value' => 260, 'aging' => 'long',
                'window' => [2025, 2034], 'place' => 'cabinet:Blancs', 'days' => 120, 'tags' => ['occasion spéciale'],
            ],
            [
                'name' => 'Chablis 1er Cru Montée de Tonnerre', 'producer' => 'William Fèvre', 'category' => 'white', 'vintage' => 2021,
                'region' => 'Bourgogne', 'grapes' => ['Chardonnay'], 'quantity' => 4, 'price' => 42, 'aging' => 'medium',
                'window' => [2024, 2029], 'place' => 'cabinet:Blancs', 'days' => 90,
            ],
            [
                'name' => 'Sancerre Les Romains', 'producer' => 'Domaine Vacheron', 'category' => 'white', 'vintage' => 2023,
                'region' => 'Val de Loire', 'grapes' => ['Sauvignon Blanc'], 'quantity' => 3, 'price' => 34, 'aging' => 'early',
                'window' => [2024, 2026], 'place' => 'service:Bulles & blancs', 'days' => 14,
                'drunk' => [['rating' => 4, 'note' => 'Tendu, minéral : parfait avec les huîtres.']],
            ],
            [
                'name' => 'Brut Réserve', 'producer' => 'Billecart-Salmon', 'category' => 'sparkling', 'appellation' => 'Champagne', 'region' => 'Champagne',
                'grapes' => ['Pinot Meunier', 'Chardonnay', 'Pinot Noir'], 'quantity' => 6, 'price' => 52, 'aging' => 'early',
                'window' => [2025, 2028], 'place' => 'cabinet:Bulles', 'days' => 200, 'tags' => ['apéro'],
                'drunk' => [['rating' => 4, 'note' => 'Bulles fines, parfait à l’apéro avec les gougères.']],
                'gift' => 'Paul & Léa',
            ],
            [
                'name' => 'Dom Pérignon', 'producer' => 'Moët & Chandon', 'category' => 'sparkling', 'vintage' => 2013, 'appellation' => 'Champagne',
                'region' => 'Champagne', 'grapes' => ['Chardonnay', 'Pinot Noir'], 'quantity' => 1, 'price' => 230, 'aging' => 'long',
                'window' => [2021, 2035], 'place' => 'cabinet:Bulles', 'days' => 180, 'tags' => ['fête'], 'from' => 'Cadeau',
                'description' => 'Offert pour les 40 ans de Camille. À ouvrir pour une grande occasion !',
            ],
            [
                'name' => 'Crémant d’Alsace Brut', 'producer' => 'Allimant-Laugner', 'category' => 'sparkling', 'region' => 'Alsace',
                'grapes' => ['Pinot Blanc', 'Auxerrois'], 'quantity' => 12, 'price' => 12, 'aging' => 'early',
                'window' => [2025, 2027], 'place' => 'vault:Cartons', 'days' => 100, 'from' => 'Foire aux vins', 'tags' => ['apéro'],
                'drunk' => [['quantity' => 3, 'rating' => 3, 'note' => 'Simple et efficace pour l’anniversaire du petit.']],
            ],
            [
                'name' => 'Bandol Rosé', 'producer' => 'Domaine Tempier', 'category' => 'rose', 'vintage' => 2024, 'region' => 'Provence',
                'grapes' => ['Mourvèdre', 'Grenache', 'Cinsault'], 'quantity' => 3, 'price' => 38, 'aging' => 'early',
                'window' => [2025, 2027], 'place' => 'service:Rosés', 'days' => 6, 'tags' => ['été'],
            ],
            [
                'name' => 'Côte-Rôtie Brune et Blonde', 'producer' => 'E. Guigal', 'category' => 'red', 'vintage' => 2018, 'region' => 'Vallée du Rhône',
                'grapes' => ['Syrah', 'Viognier'], 'quantity' => 3, 'price' => 75, 'aging' => 'long',
                'window' => [2024, 2033], 'place' => 'cabinet:Rhône & Sud', 'days' => 150,
            ],
            [
                'name' => 'Châteauneuf-du-Pape La Crau', 'producer' => 'Domaine du Vieux Télégraphe', 'category' => 'red', 'vintage' => 2019,
                'region' => 'Vallée du Rhône', 'grapes' => ['Grenache', 'Syrah', 'Mourvèdre'], 'alcohol' => 15, 'quantity' => 6, 'price' => 68, 'aging' => 'long',
                'window' => [2025, 2036], 'place' => 'vault:Garde longue', 'days' => 210,
            ],
            [
                'name' => 'Morgon Côte du Py', 'producer' => 'Jean Foillard', 'category' => 'red', 'vintage' => 2023, 'region' => 'Beaujolais',
                'grapes' => ['Gamay'], 'quantity' => 6, 'price' => 29, 'aging' => 'early', 'window' => [2024, 2026],
                'place' => 'service:Rouges du moment', 'days' => 70, 'tags' => ['nature', 'copains'],
                'drunk' => [['quantity' => 2, 'rating' => 5, 'note' => 'Croquant, gourmand, on en a ouvert une deuxième !']],
            ],
            [
                'name' => 'Riesling Cuvée Frédéric Émile', 'producer' => 'Trimbach', 'category' => 'white', 'vintage' => 2017, 'region' => 'Alsace',
                'grapes' => ['Riesling'], 'quantity' => 2, 'price' => 65, 'aging' => 'long', 'window' => [2023, 2032],
                'place' => 'vault:Loire & Alsace', 'days' => 190,
            ],
            [
                'name' => 'Vouvray Le Haut-Lieu Sec', 'producer' => 'Domaine Huet', 'category' => 'white', 'vintage' => 2018, 'region' => 'Val de Loire',
                'grapes' => ['Chenin'], 'quantity' => 3, 'price' => 36, 'aging' => 'long', 'window' => [2022, 2033],
                'place' => 'vault:Loire & Alsace', 'days' => 175,
            ],
            [
                'name' => 'Château d’Yquem', 'category' => 'sweet', 'vintage' => 2009, 'appellation' => 'Sauternes', 'region' => 'Bordeaux',
                'grapes' => ['Sémillon', 'Sauvignon Blanc'], 'quantity' => 2, 'format' => 'half', 'price' => 190, 'value' => 240,
                'aging' => 'very_long', 'window' => [2019, 2045], 'place' => 'vault:Liquoreux', 'days' => 235, 'tags' => ['mythique'],
            ],
            [
                'name' => 'Taylor’s Vintage Port', 'producer' => 'Taylor’s', 'category' => 'fortified', 'vintage' => 2017, 'appellation' => 'Porto',
                'region' => 'Douro', 'country' => 'Portugal', 'grapes' => ['Touriga Nacional'], 'alcohol' => 20, 'quantity' => 2, 'price' => 90,
                'aging' => 'very_long', 'window' => [2030, 2055], 'place' => 'vault:Liquoreux', 'days' => 130,
            ],
            [
                'name' => 'Arbois Vin Jaune', 'producer' => 'Domaine Rolet', 'category' => 'white', 'vintage' => 2015, 'region' => 'Jura',
                'grapes' => ['Savagnin'], 'quantity' => 1, 'format' => 'clavelin', 'price' => 45, 'aging' => 'very_long',
                'window' => [2022, 2060], 'place' => 'vault:Garde longue', 'days' => 110, 'description' => 'Avec un vieux comté, rien d’autre.',
            ],
            [
                'name' => 'Château Talbot', 'category' => 'red', 'vintage' => 2010, 'appellation' => 'Saint-Julien', 'region' => 'Bordeaux',
                'grapes' => ['Cabernet Sauvignon', 'Merlot'], 'quantity' => 1, 'format' => 'magnum', 'price' => 160, 'aging' => 'long',
                'window' => [2018, 2030], 'place' => 'cabinet:Magnums', 'days' => 225, 'tags' => ['magnum', 'fête'],
            ],
            [
                'name' => 'Tignanello', 'producer' => 'Antinori', 'category' => 'red', 'vintage' => 2018, 'region' => 'Toscane', 'country' => 'Italie',
                'grapes' => ['Sangiovese', 'Cabernet Sauvignon'], 'quantity' => 2, 'price' => 120, 'aging' => 'long',
                'window' => [2024, 2034], 'place' => 'vault:Étranger', 'days' => 165,
            ],
            [
                'name' => 'Pesquera Crianza', 'producer' => 'Alejandro Fernández', 'category' => 'red', 'vintage' => 2019, 'region' => 'Ribera del Duero',
                'country' => 'Espagne', 'grapes' => ['Tempranillo'], 'quantity' => 3, 'price' => 26, 'aging' => 'medium',
                'window' => [2022, 2027], 'place' => 'vault:Étranger', 'days' => 95,
            ],
            [
                'name' => 'Beaujolais Nouveau', 'producer' => 'Georges Duboeuf', 'category' => 'red', 'vintage' => 2023, 'region' => 'Beaujolais',
                'grapes' => ['Gamay'], 'quantity' => 1, 'price' => 8, 'aging' => 'early', 'window' => [2023, 2024],
                'place' => 'service:Rouges du moment', 'days' => 80, 'description' => 'Rescapé de la soirée de novembre…', 'from' => 'Supermarché',
            ],
            [
                'name' => 'Château Montrose', 'category' => 'red', 'vintage' => 2022, 'appellation' => 'Saint-Estèphe', 'region' => 'Bordeaux',
                'grapes' => ['Cabernet Sauvignon', 'Merlot'], 'quantity' => 6, 'price' => 170, 'aging' => 'very_long',
                'window' => [2034, 2060], 'place' => 'vault:Cartons', 'days' => 10, 'tags' => ['primeur', 'patience'],
                'description' => 'Caisse bois de 6, achetée en primeur pour les 18 ans de Léo.',
            ],
            [
                'name' => 'Ribolla Gialla', 'producer' => 'Gravner', 'category' => 'orange', 'vintage' => 2016, 'region' => 'Frioul', 'country' => 'Italie',
                'grapes' => ['Ribolla Gialla'], 'quantity' => 1, 'price' => 85, 'aging' => 'long', 'window' => [2022, 2032],
                'place' => 'vault:Étranger', 'days' => 125,
            ],
            [
                'name' => 'Mas de Daumas Gassac', 'category' => 'red', 'vintage' => 2018, 'region' => 'Languedoc-Roussillon',
                'grapes' => ['Cabernet Sauvignon'], 'quantity' => 3, 'price' => 48, 'aging' => 'long', 'window' => [2023, 2033],
                'place' => 'cabinet:Rhône & Sud', 'days' => 145,
            ],
            [
                'name' => 'Jurançon Symphonie de Novembre', 'producer' => 'Domaine Cauhapé', 'category' => 'sweet', 'vintage' => 2021, 'region' => 'Sud-Ouest',
                'grapes' => ['Petit Manseng'], 'quantity' => 2, 'price' => 24, 'aging' => 'long', 'window' => [2024, 2036],
                'place' => 'vault:Liquoreux', 'days' => 85,
            ],
            [
                'name' => 'Château Gruaud Larose', 'category' => 'red', 'vintage' => 2010, 'appellation' => 'Saint-Julien', 'region' => 'Bordeaux',
                'grapes' => ['Cabernet Sauvignon', 'Merlot'], 'quantity' => 3, 'price' => 70, 'aging' => 'long', 'window' => [2018, 2032],
                'place' => 'cabinet:Grands bordeaux', 'days' => 238,
                'drunk' => [
                    ['rating' => 5, 'note' => 'Coup de cœur : cuir, tabac, fruits noirs. Avec la côte de bœuf.'],
                    ['rating' => 5, 'note' => 'Toujours aussi bon. Il faut en racheter !'],
                    ['rating' => 4],
                ],
            ],
            [
                'name' => 'Saint-Joseph', 'producer' => 'Domaine Gonon', 'category' => 'red', 'vintage' => 2019, 'region' => 'Vallée du Rhône',
                'grapes' => ['Syrah'], 'quantity' => 2, 'price' => 35, 'aging' => 'medium', 'window' => [2022, 2028],
                'place' => 'cabinet:Rhône & Sud', 'days' => 205,
                'drunk' => [['rating' => 4, 'note' => 'Superbe avec l’agneau, poivre et violette.']],
                'discard' => 'corked',
            ],
        ];
    }
}
