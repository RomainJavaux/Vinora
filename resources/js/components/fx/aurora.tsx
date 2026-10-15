import type { CSSProperties } from 'react';
import { seeded } from '@/lib/search';
import { cn } from '@/lib/utils';

/**
 * Fixed background behind all the content: four warm radial glows that
 * drift slowly (no blur filter), and a fine grain fading downwards.
 */
export function Aurora({ className }: { className?: string }) {
    return (
        <div
            aria-hidden
            className={cn(
                'pointer-events-none fixed inset-0 -z-10 overflow-hidden',
                className,
            )}
        >
            <div className="aurora-blob aurora-1 -top-[18vmax] -left-[12vmax] size-[55vmax]" />
            <div className="aurora-blob aurora-2 top-[10vh] -right-[16vmax] size-[48vmax]" />
            <div className="aurora-blob aurora-3 top-[45vh] left-[8vw] size-[40vmax]" />
            <div className="aurora-blob aurora-4 -right-[10vmax] -bottom-[18vmax] size-[35vmax]" />
            <div className="aurora-grain absolute inset-0" />
        </div>
    );
}

/**
 * Bubbles rising in the hero areas, like in a glass of Champagne. Their
 * positions are pseudo-random but deterministic (no Math.random in render).
 */
export function Bubbles({
    count = 16,
    seed = 1,
    className,
}: {
    count?: number;
    seed?: number;
    className?: string;
}) {
    return (
        <div
            aria-hidden
            className={cn(
                'pointer-events-none absolute inset-0 overflow-hidden',
                className,
            )}
        >
            {Array.from({ length: count }, (_, index) => {
                const r = (offset: number) =>
                    seeded(seed * 97 + index * 13 + offset);
                const size = 4 + r(1) * 10;

                return (
                    <span
                        key={index}
                        className="bubble"
                        style={
                            {
                                left: `${r(2) * 100}%`,
                                width: size,
                                height: size,
                                animationDuration: `${7 + r(3) * 9}s`,
                                animationDelay: `${-r(4) * 14}s`,
                                '--sway': `${(r(5) - 0.5) * 60}px`,
                                opacity: 0.4 + r(6) * 0.5,
                            } as CSSProperties
                        }
                    />
                );
            })}
        </div>
    );
}
