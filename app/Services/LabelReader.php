<?php

namespace App\Services;

use Anthropic\Beta\Messages\BetaTextBlock;
use Anthropic\Client;
use Anthropic\Core\Exceptions\APIConnectionException;
use Anthropic\Core\Exceptions\APIException;
use Anthropic\Core\Exceptions\APIStatusException;
use Anthropic\Core\Exceptions\AuthenticationException;
use Anthropic\Core\Exceptions\PermissionDeniedException;
use Anthropic\Core\Exceptions\RateLimitException;
use Anthropic\ErrorType;
use App\Enums\AgingPotential;
use App\Enums\BottleFormat;
use App\Enums\WineCategory;
use App\Exceptions\LabelReadingFailed;
use App\Http\Requests\WineRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\Encoders\JpegEncoder;
use Intervention\Image\ImageManager;
use Throwable;

/**
 * Reads a wine label with Claude, always with the key of the user who asks:
 * the server has no key of its own.
 *
 * @phpstan-type LabelFields array{name: string|null, producer: string|null, vintage: int|null, appellation: string|null, region: string|null, country: string|null, category: string|null, grapes: list<string>, grapesInferred: bool, alcohol: float|null, format: string|null, aging: string|null}
 */
class LabelReader
{
    public const MODEL = 'claude-opus-5-5';

    /** Longest side sent to Claude; larger images are downscaled anyway. */
    private const MAX_EDGE = 1568;

    private const INSTRUCTIONS = <<<'TEXT'
        You read wine labels from photos for a French wine-cellar app. Fill the schema with what the label shows, plus safe deductions only:
        - name: the wine as people call it — the château, clos or cuvée name (e.g. "Château Talbot", "Les Pucelles", "Brut Réserve"). Keep the label's spelling and accents.
        - producer: the estate, house or négociant when it differs from the name, otherwise null.
        - vintage: only if a year is printed as the vintage.
        - appellation as printed (without "Appellation … Contrôlée"); region and country deduced from it, written in French (Bourgogne, Vallée du Rhône, Italie, Espagne).
        - category: the colour or style, from the label or when the appellation leaves no doubt; otherwise null.
        - grapes: printed grape varieties; when none is printed but the appellation imposes them (Chablis → Chardonnay), list them and set grapes_inferred to true.
        - alcohol: the printed % vol. format: only if a volume is printed (37,5 cl → half, 50 cl → medium, 62 cl → clavelin, 75 cl → standard, 1 l → liter, 1,5 l → magnum, 3 l → jeroboam).
        - aging: the usual ageing potential of this wine if you can judge it, otherwise null.
        If the photo is not a wine label, set is_wine_label to false and everything else to null or empty. Never invent a value you cannot read or safely deduce.
        TEXT;

    /**
     * Check that the key can really read labels: a tiny request on the same
     * model (well under a tenth of a cent). It also catches a key outside any
     * workspace or an account without credit, which listing models does not.
     */
    public function verify(#[\SensitiveParameter] string $apiKey): void
    {
        try {
            $this->client($apiKey)->messages->create(
                maxTokens: 64,
                model: self::MODEL,
                messages: [['role' => 'user', 'content' => 'Réponds simplement OK.']],
                outputConfig: ['effort' => 'low'],
            );
        } catch (AuthenticationException|PermissionDeniedException) {
            throw LabelReadingFailed::invalidKey();
        } catch (APIConnectionException) {
            throw LabelReadingFailed::unreachable();
        } catch (RateLimitException) {
            // Busy account: the key itself was accepted.
        } catch (APIStatusException $exception) {
            if (($exception->status ?? 0) < 500) {
                throw new LabelReadingFailed(self::explain($exception), 400);
            }
        } catch (APIException) {
            // Anthropic is having a hiccup: the key itself was accepted.
        }
    }

    /**
     * @return LabelFields
     */
    public function read(#[\SensitiveParameter] string $apiKey, UploadedFile $photo): array
    {
        $image = $this->jpeg($photo);

        try {
            $message = $this->client($apiKey)->beta->messages->create(
                maxTokens: 8000,
                model: self::MODEL,
                system: self::INSTRUCTIONS,
                messages: [[
                    'role' => 'user',
                    'content' => [
                        ['type' => 'image', 'source' => ['type' => 'base64', 'mediaType' => 'image/jpeg', 'data' => base64_encode($image)]],
                        ['type' => 'text', 'text' => 'Lis cette étiquette.'],
                    ],
                ]],
                outputConfig: [
                    'effort' => 'low',
                    'format' => ['type' => 'json_schema', 'schema' => self::schema()],
                ],
                // When a policy check declines, the API retries on the
                // model's default fallback instead of failing.
                fallbacks: 'default',
                betas: ['server-side-fallback-2026-07-01'],
            );
        } catch (AuthenticationException|PermissionDeniedException) {
            throw LabelReadingFailed::invalidKey();
        } catch (RateLimitException) {
            throw new LabelReadingFailed('Ton compte Anthropic a atteint sa limite. Réessaie dans une minute.', 429);
        } catch (APIConnectionException) {
            throw LabelReadingFailed::unreachable();
        } catch (APIStatusException $exception) {
            report($exception);

            throw ($exception->status ?? 0) >= 500
                ? new LabelReadingFailed('Anthropic est surchargé pour le moment. Réessaie dans un instant.', 503)
                : new LabelReadingFailed(self::explain($exception), 400);
        } catch (APIException $exception) {
            report($exception);

            throw new LabelReadingFailed('Anthropic n’a pas pu lire cette photo. Réessaie ou remplis la fiche à la main.', 502);
        }

        if ($message->stopReason === 'refusal' || $message->stopReason === 'max_tokens') {
            throw new LabelReadingFailed('Cette étiquette n’a pas pu être lue. Remplis la fiche à la main.');
        }

        $text = null;

        foreach ($message->content as $block) {
            if ($block instanceof BetaTextBlock) {
                $text = $block->text;
                break;
            }
        }

        $data = is_string($text) ? json_decode($text, true) : null;

        if (! is_array($data)) {
            throw new LabelReadingFailed('Cette étiquette n’a pas pu être lue. Remplis la fiche à la main.');
        }

        if (($data['is_wine_label'] ?? false) !== true) {
            throw new LabelReadingFailed('Je ne vois pas d’étiquette de vin sur cette photo. Cadre bien l’étiquette et réessaie.');
        }

        return self::fields($data);
    }

    /**
     * Claude's answer, cleaned and limited like the form's fields.
     *
     * @param  array<mixed>  $data
     * @return LabelFields
     */
    public static function fields(array $data): array
    {
        $text = function (string $key, int $max) use ($data): ?string {
            $value = $data[$key] ?? null;

            if (! is_string($value) || trim($value) === '') {
                return null;
            }

            return mb_substr(trim((string) preg_replace('/\s+/u', ' ', $value)), 0, $max);
        };

        $vintage = $data['vintage'] ?? null;
        $alcohol = $data['alcohol'] ?? null;
        $grapes = array_slice(WineRequest::cleanList(is_array($data['grapes'] ?? null) ? $data['grapes'] : []), 0, WineRequest::MAX_GRAPES);

        return [
            'name' => $text('name', 120),
            'producer' => $text('producer', 120),
            'vintage' => is_int($vintage) && $vintage >= 1800 && $vintage <= now()->year + 1 ? $vintage : null,
            'appellation' => $text('appellation', 120),
            'region' => $text('region', 60),
            'country' => $text('country', 60),
            'category' => WineCategory::tryFrom((string) ($data['category'] ?? ''))?->value,
            'grapes' => array_map(fn (string $grape) => mb_substr($grape, 0, 40), $grapes),
            'grapesInferred' => ($data['grapes_inferred'] ?? false) === true && $grapes !== [],
            'alcohol' => is_numeric($alcohol) && $alcohol > 0 && $alcohol <= 30 ? round((float) $alcohol, 1) : null,
            'format' => BottleFormat::tryFrom((string) ($data['format'] ?? ''))?->value,
            'aging' => AgingPotential::tryFrom((string) ($data['aging'] ?? ''))?->value,
        ];
    }

    /**
     * A client bound to this key only. The empty token stops the SDK from
     * falling back to credentials found on the server.
     */
    protected function client(#[\SensitiveParameter] string $apiKey): Client
    {
        if ($apiKey === '') {
            throw LabelReadingFailed::invalidKey();
        }

        return new Client(apiKey: $apiKey, authToken: '', requestOptions: ['timeout' => 60.0, 'maxRetries' => 1]);
    }

    /**
     * Why Anthropic turned the request down, in words the user can act on.
     */
    private static function explain(APIStatusException $exception): string
    {
        $message = data_get($exception->body, 'error.message');
        $message = is_string($message) ? $message : '';
        $lower = mb_strtolower($message);

        if ($exception->type === ErrorType::BILLING_ERROR || str_contains($lower, 'credit balance')) {
            return 'Ton compte Anthropic n’a plus de crédit : ajoutes-en sur console.anthropic.com (Billing), puis réessaie.';
        }

        if (str_contains($lower, 'workspace')) {
            return 'Cette clé n’est rattachée à aucun espace de travail Anthropic. Sur console.anthropic.com, crée une clé dans un workspace (« Default » convient) puis colle-la dans Réglages → Lecture d’étiquette.';
        }

        return $message !== ''
            ? 'Anthropic refuse la demande : '.Str::limit($message, 240)
            : 'Anthropic refuse la demande. Vérifie ta clé dans Réglages → Lecture d’étiquette.';
    }

    /**
     * The photo as a JPEG small enough for Claude, without metadata.
     */
    private function jpeg(UploadedFile $photo): string
    {
        try {
            $manager = ImageManager::usingDriver(Driver::class, autoOrientation: function_exists('exif_read_data'), strip: true);

            return $manager
                ->decodePath((string) $photo->getRealPath())
                ->scaleDown(self::MAX_EDGE, self::MAX_EDGE)
                ->encode(new JpegEncoder(quality: 85, strip: true))
                ->toString();
        } catch (Throwable) {
            throw new LabelReadingFailed('Cette image n’a pas pu être ouverte. Reprends la photo.');
        }
    }

    /**
     * @return array<string, mixed>
     */
    private static function schema(): array
    {
        $nullable = fn (array $type) => ['anyOf' => [$type, ['type' => 'null']]];
        $values = fn (array $cases) => array_map(fn ($case) => $case->value, $cases);

        $properties = [
            'is_wine_label' => ['type' => 'boolean'],
            'name' => $nullable(['type' => 'string']),
            'producer' => $nullable(['type' => 'string']),
            'vintage' => $nullable(['type' => 'integer']),
            'appellation' => $nullable(['type' => 'string']),
            'region' => $nullable(['type' => 'string']),
            'country' => $nullable(['type' => 'string']),
            'category' => $nullable(['type' => 'string', 'enum' => $values(WineCategory::cases())]),
            'grapes' => ['type' => 'array', 'items' => ['type' => 'string']],
            'grapes_inferred' => ['type' => 'boolean'],
            'alcohol' => $nullable(['type' => 'number']),
            'format' => $nullable(['type' => 'string', 'enum' => $values(BottleFormat::cases())]),
            'aging' => $nullable(['type' => 'string', 'enum' => $values(AgingPotential::cases())]),
        ];

        return [
            'type' => 'object',
            'properties' => $properties,
            'required' => array_keys($properties),
            'additionalProperties' => false,
        ];
    }
}
