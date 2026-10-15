import confetti from 'canvas-confetti';

const reducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let shapes: confetti.Shape[] | null = null;

function makeShapes(): confetti.Shape[] {
    if (shapes) {
        return shapes;
    }

    shapes = ['🍾', '🥂', '✨', '🍇'].map((text) =>
        confetti.shapeFromText({ text, scalar: 2 }),
    );

    return shapes;
}

/**
 * Golden sparkles and bubbles: two bursts, like a cork popping.
 */
export function celebrate(): void {
    if (typeof window === 'undefined' || reducedMotion()) {
        return;
    }

    const base = {
        origin: { x: 0.5, y: 0.35 },
        gravity: 0.7,
        ticks: 220,
        zIndex: 120,
        disableForReducedMotion: true,
    } satisfies confetti.Options;

    void confetti({
        ...base,
        particleCount: 26,
        spread: 75,
        startVelocity: 38,
        scalar: 2,
        shapes: makeShapes(),
    });

    window.setTimeout(() => {
        void confetti({
            ...base,
            particleCount: 40,
            spread: 110,
            startVelocity: 30,
            scalar: 0.9,
            shapes: ['circle'],
            colors: ['#facc15', '#fde68a', '#f59e0b', '#fb7185', '#ffffff'],
        });
    }, 160);
}

export function vibrate(pattern: number | number[]): void {
    try {
        navigator.vibrate?.(pattern);
    } catch {
        // Not supported.
    }
}
