<?php

namespace App\Enums;

enum CellarType: string
{
    case Cabinet = 'cabinet';
    case Service = 'service';
    case Builtin = 'builtin';
    case Rack = 'rack';
    case Wall = 'wall';
    case Vault = 'vault';
    case Cases = 'cases';
    case Cupboard = 'cupboard';
    case Fridge = 'fridge';
    case Offsite = 'offsite';

    public function label(): string
    {
        return match ($this) {
            self::Cabinet => 'Armoire de garde',
            self::Service => 'Cave de service',
            self::Builtin => 'Cave encastrable',
            self::Rack => 'Casier mural',
            self::Wall => 'Mur à vin',
            self::Vault => 'Cave enterrée',
            self::Cases => 'Caisses & cartons',
            self::Cupboard => 'Placard ou étagère',
            self::Fridge => 'Réfrigérateur',
            self::Offsite => 'Garde extérieure',
        };
    }

    public function shortLabel(): string
    {
        return match ($this) {
            self::Cabinet => 'Armoire',
            self::Service => 'Service',
            self::Builtin => 'Encastrable',
            self::Rack => 'Casier',
            self::Wall => 'Mur à vin',
            self::Vault => 'Cave voûtée',
            self::Cases => 'Caisses',
            self::Cupboard => 'Placard',
            self::Fridge => 'Frigo',
            self::Offsite => 'Extérieur',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Cabinet => 'Cave électrique de vieillissement à clayettes',
            self::Service => 'Petite cave pour avoir les bouteilles à température',
            self::Builtin => 'Cave sous plan de travail, intégrée à la cuisine',
            self::Rack => 'Range-bouteilles en bois ou en métal, par rangées',
            self::Wall => 'Vitrine ou mur éclairé, étiquettes en façade',
            self::Vault => 'Cave voûtée ou cellier, avec ses casiers',
            self::Cases => 'Bouteilles gardées dans leurs caisses en bois ou leurs cartons',
            self::Cupboard => 'Bouteilles debout, à boire dans les semaines qui viennent',
            self::Fridge => 'Quelques bouteilles au frais, prêtes à servir',
            self::Offsite => 'Chez le caviste, en garde-meuble ou primeurs pas encore livrés',
        };
    }

    /** Name of one compartment (singular). */
    public function compartmentLabel(): string
    {
        return match ($this) {
            self::Cabinet, self::Service, self::Builtin => 'Clayette',
            self::Rack, self::Wall => 'Rangée',
            self::Vault => 'Casier',
            self::Cases => 'Caisse',
            self::Cupboard => 'Étagère',
            self::Fridge => 'Balconnet',
            self::Offsite => 'Lot',
        };
    }

    public function compartmentPlural(): string
    {
        return match ($this) {
            self::Cabinet, self::Service, self::Builtin => 'clayettes',
            self::Rack, self::Wall => 'rangées',
            self::Vault => 'casiers',
            self::Cases => 'caisses',
            self::Cupboard => 'étagères',
            self::Fridge => 'balconnets',
            self::Offsite => 'lots',
        };
    }

    public function defaultCompartments(): int
    {
        return match ($this) {
            self::Cabinet, self::Vault => 6,
            self::Service, self::Builtin, self::Cupboard => 3,
            self::Rack, self::Cases => 4,
            self::Wall => 5,
            self::Fridge => 2,
            self::Offsite => 1,
        };
    }

    public function maxCompartments(): int
    {
        return match ($this) {
            self::Cabinet => 14,
            self::Service, self::Builtin => 6,
            self::Rack => 10,
            self::Wall => 12,
            self::Vault => 16,
            self::Cases => 40,
            self::Cupboard => 8,
            self::Fridge => 5,
            self::Offsite => 20,
        };
    }

    /** Number of bottle slots per compartment suggested by default. */
    public function defaultCapacity(): int
    {
        return match ($this) {
            self::Cabinet, self::Cupboard => 8,
            self::Service, self::Rack, self::Wall, self::Cases => 6,
            self::Builtin => 7,
            self::Vault => 24,
            self::Fridge => 4,
            self::Offsite => 12,
        };
    }

    public function maxCapacity(): int
    {
        return match ($this) {
            self::Cabinet => 60,
            self::Service, self::Rack, self::Cupboard => 30,
            self::Builtin, self::Wall, self::Cases => 24,
            self::Vault => 300,
            self::Fridge => 12,
            self::Offsite => 600,
        };
    }

    /**
     * Bottles can be stored one behind the other. Not in vault bins, cases,
     * the fridge door or a lot kept elsewhere, whose capacity is the whole.
     */
    public function hasDepth(): bool
    {
        return ! in_array($this, [self::Vault, self::Cases, self::Fridge, self::Offsite], true);
    }

    public function maxDepth(): int
    {
        return $this->hasDepth() ? 4 : 1;
    }

    /** Temperature shown on the display when none was recorded. */
    public function defaultTemperature(): ?float
    {
        return match ($this) {
            self::Cabinet, self::Builtin => 12.0,
            self::Service => 8.0,
            self::Vault => 13.0,
            self::Fridge => 5.0,
            default => null,
        };
    }

    /**
     * Kept cool to be served soon, not to age: the climate advice speaks of
     * serving temperature.
     */
    public function forServing(): bool
    {
        return in_array($this, [self::Service, self::Fridge], true);
    }

    /**
     * @return list<string>
     */
    public function defaultNames(int $count): array
    {
        $label = $this->compartmentLabel();

        return array_map(fn (int $i) => "{$label} {$i}", range(1, max(1, $count)));
    }
}
