import { motion } from 'motion/react';
import { useId } from 'react';
import { cn } from '@/lib/utils';

type Option<T extends string> = {
    value: T;
    label: string;
    count?: number;
};

type Props<T extends string> = {
    options: Option<T>[];
    value: T;
    onChange: (value: T) => void;
    compact?: boolean;
    className?: string;
    'aria-label'?: string;
};

export function Segmented<T extends string>({
    options,
    value,
    onChange,
    compact = false,
    className,
    ...props
}: Props<T>) {
    const id = useId();

    return (
        <div
            role="tablist"
            aria-label={props['aria-label']}
            className={cn(
                'inline-flex rounded-2xl bg-muted/80 p-1',
                compact ? 'gap-0.5' : 'gap-1',
                className,
            )}
        >
            {options.map((option) => {
                const active = option.value === value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'relative flex flex-1 items-center justify-center gap-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors',
                            compact ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-sm',
                            active
                                ? 'text-foreground'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {active && (
                            <motion.span
                                layoutId={`${id}-pill`}
                                className="absolute inset-0 rounded-xl bg-card shadow-soft"
                                transition={{
                                    type: 'spring',
                                    stiffness: 500,
                                    damping: 38,
                                }}
                            />
                        )}
                        <span className="relative">{option.label}</span>
                        {option.count !== undefined && (
                            <span
                                className={cn(
                                    'relative rounded-full px-1.5 text-[11px] font-bold tabular-nums',
                                    active
                                        ? 'bg-primary/12 text-primary'
                                        : 'bg-foreground/8',
                                )}
                            >
                                {option.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
