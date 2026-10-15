const MAX_SIDE = 1600;
const MAX_BYTES = 1.5 * 1024 * 1024;

/**
 * Shrink big photos in the browser before sending them: at most 1600 px,
 * EXIF orientation respected, re-encoded in JPEG (quality 0.85). GIFs are
 * left untouched.
 */
export async function compressImage(file: File): Promise<File> {
    if (file.type === 'image/gif' || !file.type.startsWith('image/')) {
        return file;
    }

    let bitmap: ImageBitmap;

    try {
        bitmap = await createImageBitmap(file, {
            imageOrientation: 'from-image',
        });
    } catch {
        return file;
    }

    const largest = Math.max(bitmap.width, bitmap.height);

    if (largest <= MAX_SIDE && file.size <= MAX_BYTES) {
        bitmap.close();

        return file;
    }

    const scale = Math.min(1, MAX_SIDE / largest);
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');

    if (!context) {
        bitmap.close();

        return file;
    }

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.85),
    );

    if (!blob) {
        return file;
    }

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';

    return new File([blob], name, { type: 'image/jpeg' });
}
