<?php

namespace App\Http\Controllers;

use App\Exceptions\LabelReadingFailed;
use App\Services\LabelReader;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

/**
 * « Lire l’étiquette » : the photo goes to Claude with the user's own key and
 * comes back as the fields of the form, for the user to check.
 */
class WineLabelController extends Controller
{
    public function __invoke(Request $request, LabelReader $reader): JsonResponse
    {
        $user = $this->user($request);

        if (! $user->canReadLabels()) {
            return $this->failed('Ajoute d’abord ta clé d’API Anthropic dans Réglages → Lecture d’étiquette.', 403);
        }

        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:15360'],
        ]);

        /** @var UploadedFile $photo */
        $photo = $request->file('photo');

        try {
            return response()->json(['fields' => $reader->read((string) $user->anthropic_api_key, $photo)]);
        } catch (LabelReadingFailed $exception) {
            return $this->failed($exception->getMessage(), $exception->status);
        }
    }

    /**
     * Shaped like a validation error so the form shows it under the photo.
     */
    private function failed(string $message, int $status): JsonResponse
    {
        return response()->json(['message' => $message, 'errors' => ['photo' => [$message]]], $status);
    }
}
