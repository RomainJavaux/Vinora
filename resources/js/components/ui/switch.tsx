import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

type Props = {
    checked: boolean;
    onChange: (checked: boolean) => void;
    /** Name of the hidden field (1/0), for classic forms. */
    name?: string;
    id?: string;
    className?: string;
    'aria-label'?: string;
    'aria-describedby'?: string;
};

export function Switch({ checked, onChange, name, id, className, ...props }: Props) {
    return (
        <>
            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={props['aria-label']}
                aria-describedby={props['aria-describedby']}
                onClick={() => onChange(!checked)}
                className={cn(
                    'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none',
                    checked ? 'justify-end bg-primary' : 'justify-start bg-foreground/15',
                    className,
                )}
            >
                <motion.span
                    layout
                    transition={{ type: 'spring', stiffness: 600, damping: 32 }}
                    className="size-6 rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.2)]"
                />
            </button>
            {name && <input type="hidden" name={name} value={checked ? '1' : '0'} />}
        </>
    );
}
