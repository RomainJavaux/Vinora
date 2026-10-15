import { Check } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { gradient } from '@/lib/catalog';
import { cn } from '@/lib/utils';
import type { PaletteKey, PaletteOption } from '@/types/models';

export function EmojiGrid({
    emojis,
    value,
    onChange,
    className,
}: {
    emojis: string[];
    value: string | null;
    onChange: (emoji: string) => void;
    className?: string;
}) {
    return (
        <div className={cn('grid grid-cols-6 gap-2 sm:grid-cols-8', className)}>
            {emojis.map((emoji) => {
                const active = emoji === value;

                return (
                    <button
                        key={emoji}
                        type="button"
                        aria-pressed={active}
                        aria-label={emoji}
                        onClick={() => onChange(emoji)}
                        className={cn(
                            'flex aspect-square items-center justify-center rounded-2xl text-2xl transition-[transform,background-color] duration-150 hover:scale-[1.12] hover:-rotate-4',
                            active
                                ? 'bg-primary/15 ring-2 ring-primary'
                                : 'bg-muted/70 hover:bg-accent',
                        )}
                    >
                        {emoji}
                    </button>
                );
            })}
        </div>
    );
}

export function ColorSwatches({
    options,
    value,
    onChange,
    className,
}: {
    options: PaletteOption[];
    value: PaletteKey | string;
    onChange: (value: PaletteKey) => void;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-wrap gap-3', className)}>
            {options.map((option) => {
                const active = option.value === value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        aria-label={option.label}
                        title={option.label}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'relative flex size-11 items-center justify-center rounded-full transition-transform duration-150 active:scale-90',
                            active && 'ring-2 ring-foreground ring-offset-2 ring-offset-background',
                        )}
                        style={{ background: gradient(option) }}
                    >
                        <AnimatePresence>
                            {active && (
                                <motion.span
                                    initial={{ scale: 0, rotate: -30 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    exit={{ scale: 0 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                                >
                                    <Check className="size-5 text-white drop-shadow" strokeWidth={3} />
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                );
            })}
        </div>
    );
}

export function StarRating({
    value,
    onChange,
    size = 'md',
    className,
}: {
    value: number | null;
    onChange?: (value: number | null) => void;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}) {
    const sizes = { sm: 'text-sm', md: 'text-2xl', lg: 'text-4xl' };

    if (!onChange) {
        return (
            <span
                className={cn('inline-flex gap-0.5 leading-none', sizes[size], className)}
                aria-label={value ? `${value} sur 5` : 'Pas de note'}
            >
                {[1, 2, 3, 4, 5].map((star) => (
                    <span
                        key={star}
                        className={star <= Math.round(value ?? 0) ? 'text-warm' : 'text-foreground/15'}
                    >
                        ★
                    </span>
                ))}
            </span>
        );
    }

    return (
        <div className={cn('flex gap-1', className)} role="radiogroup" aria-label="Note sur 5">
            {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= (value ?? 0);

                return (
                    <motion.button
                        key={star}
                        type="button"
                        role="radio"
                        aria-checked={value === star}
                        aria-label={`${star} sur 5`}
                        whileTap={{ scale: 0.8 }}
                        animate={{ scale: filled ? 1.05 : 1, rotate: filled ? 0 : -8 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        onClick={() => onChange(value === star ? null : star)}
                        className={cn(
                            'leading-none transition-colors',
                            sizes[size],
                            filled ? 'text-warm drop-shadow-[0_2px_6px_rgb(234_179_8/0.45)]' : 'text-foreground/15 hover:text-warm/50',
                        )}
                    >
                        ★
                    </motion.button>
                );
            })}
        </div>
    );
}
