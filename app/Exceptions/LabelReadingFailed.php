<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * A label could not be read, with a message for the user and the HTTP status
 * the endpoint answers with.
 */
class LabelReadingFailed extends RuntimeException
{
    public function __construct(string $message, public readonly int $status = 422)
    {
        parent::__construct($message);
    }

    public static function invalidKey(): self
    {
        return new self('Anthropic refuse ta clé. Vérifie-la dans Réglages → Lecture d’étiquette.', 400);
    }

    public static function unreachable(): self
    {
        return new self('Impossible de joindre Anthropic pour le moment. Réessaie dans un instant.', 503);
    }
}
