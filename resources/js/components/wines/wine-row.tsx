import { Link } from '@inertiajs/react';
import { Wine as WineIcon } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import {
    LocationPill,
    RatingBadge,
    WindowBadge,
    WineAvatar,
} from '@/components/wines/wine-visuals';
import { formatQuantity, useCatalog } from '@/lib/catalog';
import { cn } from '@/lib/utils';
import wines from '@/routes/wines';
import type { Wine } from '@/types/models';

type Props = {
    wine: Wine;
    index?: number;
    onDrink?: (wine: Wine) => void;
    highlighted?: boolean;
    showLocation?: boolean;
    action?: ReactNode;
    muted?: boolean;
    subtitle?: ReactNode;
    className?: string;
};

/**
 * A wine in a list. The name is a stretched link over the whole card; the
 * location pill and the « Boire » button stay clickable above it.
 */
export function WineRow({
    wine,
    index = 0,
    onDrink,
    highlighted = false,
    showLocation = true,
    action,
    muted = false,
    subtitle,
    className,
}: Props) {
    const catalog = useCatalog();
    const origin = [
        wine.vintage ?? 'Non millésimé',
        wine.appellation ?? wine.region,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <motion.article
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{
                type: 'spring',
                stiffness: 380,
                damping: 30,
                delay: Math.min(index, 12) * 0.03,
            }}
            data-wine={wine.id}
            className={cn(
                'surface relative flex items-center gap-3.5 rounded-[22px] p-3 pr-3.5 transition-shadow hover:shadow-float',
                className,
            )}
        >
            {highlighted && (
                <motion.span
                    className="pointer-events-none absolute -inset-[3px] rounded-[25px]"
                    style={{
                        boxShadow:
                            '0 0 0 2.5px var(--primary), 0 12px 30px -10px var(--primary)',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0.4, 1, 0.6] }}
                    transition={{ duration: 2, delay: 0.9 }}
                />
            )}

            <WineAvatar
                category={wine.category}
                region={wine.region}
                vintage={wine.vintage}
                photoUrl={wine.photoUrl}
                size="md"
                muted={muted}
            />

            <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-[16px] leading-tight font-bold">
                    <Link
                        href={wines.show(wine.id)}
                        className="stretched-link outline-none"
                    >
                        {wine.name}
                    </Link>
                </h3>
                <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                    {wine.producer ? `${wine.producer} · ` : ''}
                    {origin}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {subtitle ?? (
                        <>
                            <span className="text-[13px] font-bold tabular-nums">
                                {formatQuantity(
                                    catalog,
                                    wine.quantity,
                                    wine.format,
                                )}
                            </span>
                            <WindowBadge window={wine.window} />
                            <RatingBadge rating={wine.rating} />
                        </>
                    )}
                </div>
                {showLocation && (
                    <div className="mt-1.5 flex min-w-0">
                        <LocationPill
                            location={wine.location}
                            wineId={wine.id}
                        />
                    </div>
                )}
            </div>

            {action ??
                (onDrink && wine.quantity > 0 && (
                    <button
                        type="button"
                        onClick={() => onDrink(wine)}
                        className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-primary-foreground active:scale-90"
                        aria-label={`Boire ${wine.name}`}
                        title="Boire"
                    >
                        <WineIcon className="size-5" />
                    </button>
                ))}
        </motion.article>
    );
}
