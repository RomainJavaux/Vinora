/**
 * Generate every PWA icon from the single logo SVG:
 *   node scripts/generate-icons.mjs
 *
 * - icons/icon-192.png, icons/icon-512.png       rounded logo ("any")
 * - icons/maskable-192.png, icons/maskable-512.png full-bleed background
 * - apple-touch-icon.png (180, full bleed)
 * - favicon.ico (16/32/48 PNG inside a hand-written ICO container)
 * - favicon.svg
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(
    resolve(root, 'resources/icons/logo.svg'),
    'utf8',
);
const fullBleed = source
    .replace('rx="18" fill="url(#tile)"', 'rx="0" fill="url(#tile)"')
    .replace('rx="18" fill="url(#shine)"', 'rx="0" fill="url(#shine)"');
const publicDir = resolve(root, 'public');

await mkdir(resolve(publicDir, 'icons'), { recursive: true });

const png = (svg, size) =>
    sharp(Buffer.from(svg), { density: 384 })
        .resize(size, size)
        .png()
        .toBuffer();

const outputs = [
    ['icons/icon-192.png', source, 192],
    ['icons/icon-512.png', source, 512],
    ['icons/maskable-192.png', fullBleed, 192],
    ['icons/maskable-512.png', fullBleed, 512],
    ['apple-touch-icon.png', fullBleed, 180],
];

for (const [file, svg, size] of outputs) {
    await writeFile(resolve(publicDir, file), await png(svg, size));
    console.log(`✓ ${file}`);
}

await writeFile(resolve(publicDir, 'favicon.svg'), source);
console.log('✓ favicon.svg');

// ICO container holding three PNG images.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((size) => png(source, size)));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);

let offset = 6 + 16 * images.length;
const entries = images.map((image, index) => {
    const entry = Buffer.alloc(16);
    const size = sizes[index];
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += image.length;

    return entry;
});

await writeFile(
    resolve(publicDir, 'favicon.ico'),
    Buffer.concat([header, ...entries, ...images]),
);
console.log('✓ favicon.ico');
