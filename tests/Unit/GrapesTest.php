<?php

namespace Tests\Unit;

use App\Support\Grapes;
use PHPUnit\Framework\TestCase;

class GrapesTest extends TestCase
{
    public function test_the_list_is_large_sorted_and_without_duplicates(): void
    {
        $names = Grapes::names();

        $this->assertGreaterThan(300, count($names));
        $this->assertSame(count($names), count(array_unique(array_map('mb_strtolower', $names))));
        $this->assertSame('Abouriou', $names[0]);
    }

    public function test_other_names_lead_to_the_grape(): void
    {
        $byAlias = [];

        foreach (Grapes::all() as $grape) {
            foreach ($grape['aliases'] as $alias) {
                $byAlias[$alias] = $grape['name'];
            }
        }

        $this->assertSame('Syrah', $byAlias['Shiraz']);
        $this->assertSame('Grenache', $byAlias['Garnacha']);
        $this->assertSame('Tempranillo', $byAlias['Tinta Roriz']);
        $this->assertSame('Melon de Bourgogne', $byAlias['Muscadet']);
    }
}
