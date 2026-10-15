<?php

namespace App\Enums;

enum CellarType: string
{
    case Cabinet = 'cabinet';
    case Service = 'service';
    case Rack = 'rack';
    case Vault = 'vault';

    public function label(): string
    {
        return match ($this) {
            self::Cabinet => 'Armoire de garde',
            self::Service => 'Cave de service',
            self::Rack => 'Casier mural',
            self::Vault => 'Cave enterrée',
        };
    }

    public function shortLabel(): string
    {
        return match ($this) {
            self::Cabinet => 'Armoire',
            self::Service => 'Service',
            self::Rack => 'Casier',
            self::Vault => 'Cave voûtée',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Cabinet => 'Cave électrique de vieillissement à clayettes',
            self::Service => 'Petite cave pour avoir les bouteilles à température',
            self::Rack => 'Range-bouteilles en bois ou en métal, par rangées',
            self::Vault => 'Cave voûtée ou cellier, avec ses casiers',
        };
    }

    /** Name of one compartment (singular). */
    public function compartmentLabel(): string
    {
        return match ($this) {
            self::Cabinet, self::Service => 'Clayette',
            self::Rack => 'Rangée',
            self::Vault => 'Casier',
        };
    }

    public function compartmentPlural(): string
    {
        return match ($this) {
            self::Cabinet, self::Service => 'clayettes',
            self::Rack => 'rangées',
            self::Vault => 'casiers',
        };
    }

    public function defaultCompartments(): int
    {
        return match ($this) {
            self::Cabinet => 6,
            self::Service => 3,
            self::Rack => 4,
            self::Vault => 6,
        };
    }

    public function maxCompartments(): int
    {
        return match ($this) {
            self::Cabinet => 14,
            self::Service => 6,
            self::Rack => 10,
            self::Vault => 16,
        };
    }

    /** Number of bottle slots per compartment suggested by default. */
    public function defaultCapacity(): int
    {
        return match ($this) {
            self::Cabinet => 8,
            self::Service => 6,
            self::Rack => 6,
            self::Vault => 24,
        };
    }

    public function maxCapacity(): int
    {
        return match ($this) {
            self::Cabinet, self::Service => 24,
            self::Rack => 30,
            self::Vault => 300,
        };
    }

    /** Temperature shown on the display when none was recorded. */
    public function defaultTemperature(): ?float
    {
        return match ($this) {
            self::Cabinet => 12.0,
            self::Service => 8.0,
            self::Rack => null,
            self::Vault => 13.0,
        };
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
