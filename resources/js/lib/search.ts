/** Lower case, without accents. */
export function normalize(value: string | null | undefined): string {
    return (value ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim();
}

/**
 * Every word of the query must appear in the haystack (AND search, accent
 * and case insensitive).
 */
export function matches(
    query: string,
    haystack: (string | null | undefined)[],
): boolean {
    const words = normalize(query).split(/\s+/).filter(Boolean);

    if (words.length === 0) {
        return true;
    }

    const text = normalize(haystack.filter(Boolean).join(' '));

    return words.every((word) => text.includes(word));
}

/** Deterministic pseudo random number in [0, 1[ (no Math.random in render). */
export function seeded(seed: number): number {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;

    return x - Math.floor(x);
}
