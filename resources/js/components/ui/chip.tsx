import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = Omit<ComponentProps<'button'>, 'color'> & {
    active?: boolean;
    /** Colour or gradient used as the background when active. */
    color?: string;
    emoji?: string;
    icon?: ReactNode;
    size?: 'sm' | 'md';
};

export function Chip({
    active = false,
    color,
    emoji,
    icon,
    size = 'md',
    className,
    children,
    style,
    type = 'button',
    ...props
}: Props) {
    const background = color ?? 'var(--primary)';
    const activeStyle: CSSProperties | undefined = active
        ? {
              background,
              boxShadow: `0 8px 20px -10px ${color && !color.startsWith('linear') ? color : 'color-mix(in oklab, var(--primary) 70%, transparent)'}`,
          }
        : undefined;

    return (
        <button
            type={type}
            aria-pressed={active}
            className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap transition-[transform,background-color,box-shadow,border-color] duration-150 active:scale-[0.94] disabled:opacity-50',
                size === 'md' ? 'h-10 px-4 text-sm' : 'h-8 px-3 text-[13px]',
                active
                    ? 'border-transparent text-white'
                    : 'border-border bg-card text-foreground hover:border-foreground/20 hover:bg-accent/60',
                className,
            )}
            style={{ ...activeStyle, ...style }}
            {...props}
        >
            {emoji && (
                <span className="text-base leading-none" aria-hidden>
                    {emoji}
                </span>
            )}
            {icon}
            {children}
        </button>
    );
}
