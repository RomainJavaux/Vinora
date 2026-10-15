import * as React from 'react';

import { cn } from '@/lib/utils';

const fieldClasses =
    'w-full min-w-0 rounded-2xl border border-input bg-card/80 px-4 text-base text-foreground shadow-[inset_0_1px_2px_rgb(40_10_15/0.05)] outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/15';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
    return (
        <input
            type={type}
            data-slot="input"
            className={cn(
                fieldClasses,
                'h-12 file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium',
                className,
            )}
            {...props}
        />
    );
}

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
    return (
        <textarea
            data-slot="textarea"
            className={cn(fieldClasses, 'min-h-28 py-3 leading-relaxed', className)}
            {...props}
        />
    );
}

export { Input, Textarea, fieldClasses };
