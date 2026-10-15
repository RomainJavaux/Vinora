import { Minus, Plus } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { RollingNumber } from '@/components/ui/animated-number';
import { vibrate } from '@/lib/celebrate';
import { cn } from '@/lib/utils';

type Props = {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    size?: 'md' | 'lg';
    unit?: string;
    format?: (value: number) => string;
    className?: string;
    label?: string;
};

/**
 * Big − / + buttons with the figure rolling in the middle. Holding a
 * button repeats: first step at once, then every 380 ms, faster and faster
 * (×0.8) down to 60 ms.
 */
export function Stepper({
    value,
    onChange,
    min = 1,
    max = 999,
    step = 1,
    size = 'md',
    unit,
    format,
    className,
    label = 'Quantité',
}: Props) {
    const valueRef = useRef(value);
    const timer = useRef<number | null>(null);

    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    const stop = () => {
        if (timer.current !== null) {
            window.clearTimeout(timer.current);
            timer.current = null;
        }
    };

    useEffect(() => stop, []);

    const apply = (direction: 1 | -1) => {
        const next = Math.min(max, Math.max(min, valueRef.current + direction * step));

        if (next === valueRef.current) {
            stop();

            return;
        }

        valueRef.current = next;
        onChange(next);
        vibrate(8);
    };

    const start = (direction: 1 | -1) => {
        stop();
        apply(direction);

        let delay = 380;

        const repeat = () => {
            timer.current = window.setTimeout(() => {
                apply(direction);
                delay = Math.max(60, delay * 0.8);
                repeat();
            }, delay);
        };

        repeat();
    };

    const button = cn(
        'flex shrink-0 items-center justify-center rounded-2xl border border-hairline bg-card shadow-soft transition-transform active:scale-[0.92] disabled:opacity-35',
        size === 'lg' ? 'size-14' : 'size-11',
    );

    return (
        <div
            className={cn('flex items-center justify-between gap-3', className)}
            role="group"
            aria-label={label}
        >
            <button
                type="button"
                className={button}
                disabled={value <= min}
                aria-label="Moins"
                onPointerDown={(event) => {
                    event.preventDefault();
                    start(-1);
                }}
                onPointerUp={stop}
                onPointerLeave={stop}
                onPointerCancel={stop}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        apply(-1);
                    }
                }}
            >
                <Minus className={size === 'lg' ? 'size-6' : 'size-5'} />
            </button>

            <div className="flex min-w-0 flex-1 flex-col items-center leading-none">
                <RollingNumber
                    value={format ? format(value) : value}
                    className={cn(
                        'font-display font-extrabold',
                        size === 'lg' ? 'text-5xl' : 'text-3xl',
                    )}
                />
                {unit && (
                    <span className="mt-1.5 text-[13px] font-semibold text-muted-foreground">
                        {unit}
                    </span>
                )}
            </div>

            <button
                type="button"
                className={button}
                disabled={value >= max}
                aria-label="Plus"
                onPointerDown={(event) => {
                    event.preventDefault();
                    start(1);
                }}
                onPointerUp={stop}
                onPointerLeave={stop}
                onPointerCancel={stop}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        apply(1);
                    }
                }}
            >
                <Plus className={size === 'lg' ? 'size-6' : 'size-5'} />
            </button>
        </div>
    );
}
