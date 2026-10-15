import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
    "relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-[15px] font-semibold outline-none transition-[transform,box-shadow,background-color,filter,opacity] duration-150 select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-4 focus-visible:ring-ring/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
    {
        variants: {
            variant: {
                default:
                    'bg-gradient-primary text-primary-foreground shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--primary)_75%,transparent)] hover:brightness-110',
                warm: 'bg-gradient-warm text-warm-foreground shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--warm)_90%,transparent)] hover:brightness-105',
                destructive:
                    'bg-destructive text-white shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--destructive)_70%,transparent)] hover:brightness-110',
                outline:
                    'glass border border-border text-foreground hover:bg-accent/70',
                secondary:
                    'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                ghost: 'text-foreground hover:bg-accent/80',
                link: 'h-auto px-0 text-primary underline-offset-4 hover:underline active:scale-100',
            },
            size: {
                default: 'h-11 px-5',
                sm: 'h-9 rounded-xl px-3.5 text-sm',
                lg: 'h-13 px-6 text-base',
                icon: 'size-11',
                'icon-sm': 'size-9 rounded-xl',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

function Button({
    className,
    variant,
    size,
    asChild = false,
    ...props
}: React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
    }) {
    const Comp = asChild ? Slot : 'button';

    return (
        <Comp
            data-slot="button"
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    );
}

export { Button, buttonVariants };
