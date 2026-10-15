<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\ImageManager;

/**
 * Stores label photos: decoded, auto-oriented, scaled down to 1400 px and
 * re-encoded in WebP without metadata (no EXIF geolocation is kept).
 */
class PhotoStore
{
    public const MAX_SIZE = 1400;

    public function store(UploadedFile $file, int $householdId): string
    {
        $manager = ImageManager::usingDriver(Driver::class, autoOrientation: function_exists('exif_read_data'), strip: true);

        $encoded = $manager
            ->decodePath((string) $file->getRealPath())
            ->scaleDown(self::MAX_SIZE, self::MAX_SIZE)
            ->encode(new WebpEncoder(quality: 80, strip: true));

        $path = "wines/{$householdId}/".Str::uuid7().'.webp';

        Storage::disk('public')->put($path, $encoded->toString());

        return $path;
    }

    /**
     * Copy an existing photo to a new file (used when buying a wine again or
     * when splitting a lot between two compartments).
     */
    public function duplicate(?string $path, int $householdId): ?string
    {
        if ($path === null || ! Storage::disk('public')->exists($path)) {
            return null;
        }

        $copy = "wines/{$householdId}/".Str::uuid7().'.webp';

        return Storage::disk('public')->copy($path, $copy) ? $copy : null;
    }

    public function delete(?string $path): void
    {
        if ($path !== null) {
            Storage::disk('public')->delete($path);
        }
    }

    public function deleteHousehold(int $householdId): void
    {
        Storage::disk('public')->deleteDirectory("wines/{$householdId}");
    }
}
