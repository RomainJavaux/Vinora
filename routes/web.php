<?php

use App\Http\Controllers\ActivityController;
use App\Http\Controllers\CellarController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\HouseholdController;
use App\Http\Controllers\InvitationController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\TastingController;
use App\Http\Controllers\WineController;
use App\Http\Controllers\WineStockController;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)->name('home');

Route::get('invitations/{token}', [InvitationController::class, 'show'])->name('invitations.show');

Route::middleware('auth')->group(function () {
    Route::get('onboarding', [OnboardingController::class, 'show'])->name('onboarding');
    Route::post('onboarding', [OnboardingController::class, 'store'])->name('onboarding.store');

    Route::post('invitations/{token}/accept', [InvitationController::class, 'accept'])->name('invitations.accept');

    Route::post('households', [HouseholdController::class, 'store'])->name('households.store');
    Route::put('households/{household}/switch', [HouseholdController::class, 'switch'])->name('households.switch');

    Route::middleware('household')->group(function () {
        Route::get('dashboard', DashboardController::class)->name('dashboard');

        Route::resource('cellars', CellarController::class);

        Route::resource('wines', WineController::class);
        Route::post('wines/{wine}/drink', [WineStockController::class, 'drink'])->name('wines.drink');
        Route::post('wines/{wine}/gift', [WineStockController::class, 'gift'])->name('wines.gift');
        Route::post('wines/{wine}/restock', [WineStockController::class, 'restock'])->name('wines.restock');
        Route::post('wines/{wine}/move', [WineStockController::class, 'move'])->name('wines.move');
        Route::post('wines/{wine}/discard', [WineStockController::class, 'discard'])->name('wines.discard');

        Route::get('activity', ActivityController::class)->name('activity');
        Route::get('tastings', TastingController::class)->name('tastings');

        Route::get('household', [HouseholdController::class, 'show'])->name('household.show');
        Route::patch('household', [HouseholdController::class, 'update'])->name('household.update');
        Route::delete('household', [HouseholdController::class, 'destroy'])->name('household.destroy');
        Route::post('household/leave', [HouseholdController::class, 'leave'])->name('household.leave');

        Route::post('household/invitations', [InvitationController::class, 'store'])->name('invitations.store');
        Route::delete('household/invitations/{invitation}', [InvitationController::class, 'destroy'])->name('invitations.destroy');

        Route::patch('household/members/{member}', [MemberController::class, 'update'])->name('members.update');
        Route::delete('household/members/{member}', [MemberController::class, 'destroy'])->name('members.destroy');
    });
});

require __DIR__.'/settings.php';
