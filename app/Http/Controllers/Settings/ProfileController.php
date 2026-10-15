<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\Household;
use App\Services\PhotoStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(): Response
    {
        return Inertia::render('settings/profile');
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        $this->toast('Profil mis à jour');

        return to_route('profile.edit');
    }

    /**
     * Delete the user's account. The households they own are deleted for
     * everyone, with their photos.
     */
    public function destroy(ProfileDeleteRequest $request, PhotoStore $photos): RedirectResponse
    {
        $user = $request->user();

        Household::query()->where('owner_id', $user->id)->pluck('id')
            ->each(fn ($id) => $photos->deleteHousehold((int) $id));

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
