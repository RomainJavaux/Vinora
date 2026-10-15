import { Link } from '@inertiajs/react';
import type { InertiaLinkProps } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
    title,
    overline,
    description,
    actions,
    back,
    className,
}: {
    title: ReactNode;
    overline?: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    back?: { href: NonNullable<InertiaLinkProps['href']>; label?: string };
    className?: string;
}) {
    return (
        <header className={cn('mb-6 lg:mb-8', className)}>
            {back && (
                <Link
                    href={back.href}
                    className="mb-3 -ml-2 inline-flex h-8 items-center gap-1 rounded-full px-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                    <ChevronLeft className="size-4" />
                    {back.label ?? 'Retour'}
                </Link>
            )}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    {overline && (
                        <p className="mb-1.5 text-[13px] font-bold tracking-wide text-primary">
                            {overline}
                        </p>
                    )}
                    <h1 className="font-display text-[28px] leading-[1.1] font-extrabold tracking-tight text-balance break-words lg:text-4xl">
                        {title}
                    </h1>
                    {description && (
                        <p className="mt-2 max-w-2xl text-[15px] text-muted-foreground">
                            {description}
                        </p>
                    )}
                </div>
                {actions && (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {actions}
                    </div>
                )}
            </div>
        </header>
    );
}

export function SectionTitle({
    title,
    action,
    className,
}: {
    title: ReactNode;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'mb-3 flex items-center justify-between gap-3',
                className,
            )}
        >
            <h2 className="font-display text-lg font-bold tracking-tight">
                {title}
            </h2>
            {action && (
                <div className="shrink-0 text-sm font-semibold text-primary">
                    {action}
                </div>
            )}
        </div>
    );
}

export function EmptyState({
    emoji,
    title,
    description,
    action,
    className,
}: {
    emoji: string;
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'surface flex flex-col items-center px-6 py-10 text-center',
                className,
            )}
        >
            <motion.div
                className="mb-4 text-[60px] leading-none"
                animate={{ y: [0, -8, 0], rotate: [0, -5, 5, 0] }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
                aria-hidden
            >
                {emoji}
            </motion.div>
            <h3 className="font-display text-xl font-extrabold">{title}</h3>
            {description && (
                <p className="mt-2 max-w-sm text-[15px] text-muted-foreground">
                    {description}
                </p>
            )}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}
