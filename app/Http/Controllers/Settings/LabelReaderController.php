<?php

namespace App\Http\Controllers\Settings;

use App\Exceptions\LabelReadingFailed;
use App\Http\Controllers\Controller;
use App\Services\LabelReader;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The user's own Anthropic key, used only for the labels they read. It is
 * stored encrypted and never sent back to the browser.
 */
class LabelReaderController extends Controller
{
    public function edit(Request $request): Response
    {
        $user = $this->user($request);

        return Inertia::render('settings/label-reader', [
            'configured' => $user->canReadLabels(),
            'hint' => $user->anthropicKeyHint(),
        ]);
    }

    public function update(Request $request, LabelReader $reader): RedirectResponse
    {
        $validated = $request->validate([
            'key' => ['required', 'string', 'starts_with:sk-ant-', 'max:300', 'regex:/^\S+$/'],
        ], [
            'key.required' => 'Colle ta clé d’API Anthropic.',
            'key.starts_with' => 'Une clé d’API Anthropic commence par « sk‑ant‑ ».',
            'key.regex' => 'La clé ne doit pas contenir d’espace.',
        ]);

        $key = trim((string) $validated['key']);

        try {
            $reader->verify($key);
        } catch (LabelReadingFailed $exception) {
            throw ValidationException::withMessages([
                'key' => $exception->status === 400 ? 'Anthropic refuse cette clé : vérifie-la sur console.anthropic.com.' : $exception->getMessage(),
            ]);
        }

        $user = $this->user($request);
        $user->forceFill(['anthropic_api_key' => $key])->save();

        $this->toast('Clé enregistrée : la lecture d’étiquette est prête 📸');

        return to_route('label-reader.edit');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $this->user($request)->forceFill(['anthropic_api_key' => null])->save();

        $this->toast('Clé supprimée de Vinora', 'info');

        return to_route('label-reader.edit');
    }
}
