<?php

namespace Tests\Unit;

use App\Enums\AgingPotential;
use App\Enums\WineCategory;
use App\Support\DrinkWindow;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\TestCase;

class DrinkWindowTest extends TestCase
{
    public function test_the_window_is_suggested_from_the_vintage_and_the_ageing_potential(): void
    {
        $this->assertSame([2019, 2024], DrinkWindow::suggest(WineCategory::Red, AgingPotential::Medium, 2016));
        $this->assertSame([2016, 2019], DrinkWindow::suggest(WineCategory::White, null, 2016));
        $this->assertSame([2025, 2028], DrinkWindow::suggest(WineCategory::Sparkling, null, null, 2025));
        $this->assertNull(DrinkWindow::suggest(WineCategory::Other, null, 2020));
    }

    public function test_the_status_follows_the_current_year(): void
    {
        $today = CarbonImmutable::create(2026, 10, 15);

        $this->assertSame(DrinkWindow::YOUNG, DrinkWindow::status(2028, 2035, $today));
        $this->assertSame(DrinkWindow::READY, DrinkWindow::status(2024, 2030, $today));
        $this->assertSame(DrinkWindow::SOON, DrinkWindow::status(2020, 2026, $today));
        $this->assertSame(DrinkWindow::PAST, DrinkWindow::status(2015, 2022, $today));
        $this->assertSame(DrinkWindow::READY, DrinkWindow::status(2020, null, $today));
        $this->assertSame(DrinkWindow::UNKNOWN, DrinkWindow::status(null, null, $today));
    }

    public function test_the_description_gives_days_and_progress(): void
    {
        $today = CarbonImmutable::create(2026, 10, 15);

        $ready = DrinkWindow::describe(2026, 2026, 2020, null, $today);
        $this->assertSame(DrinkWindow::SOON, $ready['status']);
        $this->assertSame(77, $ready['daysLeft']);
        $this->assertGreaterThan(0.7, $ready['progress']);

        $young = DrinkWindow::describe(2027, 2035, 2022, null, $today);
        $this->assertSame(DrinkWindow::YOUNG, $young['status']);
        $this->assertSame(78, $young['daysUntilReady']);
        $this->assertGreaterThan(0.9, $young['progress']);

        $past = DrinkWindow::describe(2015, 2022, 2012, null, $today);
        $this->assertSame(1.0, $past['progress']);
        $this->assertLessThan(0, $past['daysLeft']);
    }
}
