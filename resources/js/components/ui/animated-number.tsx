import { animate, AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

const format = (value: number, decimals: number) =>
    value.toLocaleString('fr-FR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });

/**
 * Counts from the previous value to the new one in 0.9 s.
 */
export function AnimatedNumber({
    value,
    decimals = 0,
    suffix = '',
    className,
}: {
    value: number;
    decimals?: number;
    suffix?: string;
    className?: string;
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const previous = useRef(0);

    useEffect(() => {
        const node = ref.current;

        if (!node) {
            return;
        }

        const controls = animate(previous.current, value, {
            duration: 0.9,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (latest) => {
                node.textContent = format(latest, decimals) + suffix;
            },
        });

        previous.current = value;

        return () => controls.stop();
    }, [value, decimals, suffix]);

    return (
        <span ref={ref} className={cn('tabular-nums', className)}>
            {format(0, decimals) + suffix}
        </span>
    );
}

/**
 * The figure comes in from the top, blurry then sharp, at each change.
 */
export function RollingNumber({
    value,
    className,
}: {
    value: number | string;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'relative inline-flex overflow-hidden tabular-nums',
                className,
            )}
        >
            <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                    key={value}
                    initial={{ y: '-60%', opacity: 0, filter: 'blur(4px)' }}
                    animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
                    exit={{ y: '60%', opacity: 0, filter: 'blur(4px)' }}
                    transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                    className="inline-block"
                >
                    {typeof value === 'number'
                        ? value.toLocaleString('fr-FR')
                        : value}
                </motion.span>
            </AnimatePresence>
        </span>
    );
}
