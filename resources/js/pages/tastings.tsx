import { Head, Link } from '@inertiajs/react';
import { RotateCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { MemberAvatar } from '@/components/member-avatar';
import { EmptyState, PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/ui/pickers';
import { Segmented } from '@/components/ui/segmented';
import { BottleArt } from '@/components/wines/wine-visuals';
import { findCategory, useCatalog } from '@/lib/catalog';
import { formatDate, timeAgo } from '@/lib/dates';
import wines from '@/routes/wines';
import type { Movement } from '@/types/models';

type Props = {
    tastings: Movement[];
    stock: Record<string, number>;
    stats: {
        count: number;
        average: number | null;
        favorites: number;
        drunk: number;
    };
};

export default function Tastings({ tastings, stock, stats }: Props) {
    const catalog = useCatalog();
    const [filter, setFilter] = useState<'all' | 'favorites' | 'notes'>('all');

    const shown = tastings.filter((tasting) =>
        filter === 'favorites'
            ? tasting.rating === 5
            : filter === 'notes'
              ? Boolean(tasting.note)
              : true,
    );

    return (
        <>
            <Head title="Carnet de dégustation" />
            <PageHeader
                overline="Ce qu’on en a pensé"
                title="Carnet de dégustation"
                description="Chaque bouteille ouverte avec une note ou un commentaire. Les coups de cœur, on les rachète."
            />

            {tastings.length === 0 ? (
                <EmptyState
                    emoji="📓"
                    title="Ton carnet est vierge"
                    description="Quand tu ouvres une bouteille, donne-lui des étoiles et un mot : tu retrouveras tout ici."
                    action={
                        <Button asChild>
                            <Link href={wines.index({ query: { focus: 1 } })}>
                                Ouvrir une bouteille
                            </Link>
                        </Button>
                    }
                />
            ) : (
                <>
                    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Stat value={stats.count} label="dégustations notées" />
                        <Stat
                            value={
                                stats.average
                                    ? Number(stats.average.toFixed(1))
                                    : 0
                            }
                            label="note moyenne"
                            suffix="/5"
                        />
                        <Stat
                            value={stats.favorites}
                            label="coups de cœur"
                            emoji="💖"
                        />
                        <Stat
                            value={stats.drunk}
                            label="bouteilles bues"
                            emoji="🍷"
                        />
                    </div>

                    <Segmented
                        className="mb-5"
                        value={filter}
                        onChange={setFilter}
                        options={[
                            { value: 'all', label: 'Toutes' },
                            {
                                value: 'favorites',
                                label: 'Coups de cœur',
                                count: stats.favorites,
                            },
                            { value: 'notes', label: 'Avec un mot' },
                        ]}
                    />

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        <AnimatePresence mode="popLayout">
                            {shown.map((tasting, index) => {
                                const category = findCategory(
                                    catalog,
                                    tasting.wineCategory,
                                );
                                const left = tasting.wineId
                                    ? (stock[tasting.wineId] ?? 0)
                                    : 0;

                                return (
                                    <motion.article
                                        key={tasting.id}
                                        layout
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{
                                            delay: Math.min(index, 10) * 0.03,
                                        }}
                                        className="surface relative flex gap-4 p-4"
                                    >
                                        <div
                                            className="flex h-24 w-14 shrink-0 items-end justify-center rounded-2xl pb-1"
                                            style={{
                                                background: `color-mix(in oklab, ${category.color} 18%, var(--card))`,
                                            }}
                                        >
                                            <BottleArt
                                                category={tasting.wineCategory}
                                                className="h-20"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h2 className="font-display text-[16px] leading-tight font-bold">
                                                {tasting.wineId ? (
                                                    <Link
                                                        href={wines.show(
                                                            tasting.wineId,
                                                        )}
                                                        className="stretched-link"
                                                    >
                                                        {tasting.wineName}
                                                        {tasting.wineVintage
                                                            ? ` ${tasting.wineVintage}`
                                                            : ''}
                                                    </Link>
                                                ) : (
                                                    <>
                                                        {tasting.wineName}
                                                        {tasting.wineVintage
                                                            ? ` ${tasting.wineVintage}`
                                                            : ''}
                                                    </>
                                                )}
                                            </h2>
                                            {tasting.rating && (
                                                <StarRating
                                                    value={tasting.rating}
                                                    size="sm"
                                                    className="mt-1"
                                                />
                                            )}
                                            {tasting.note && (
                                                <p className="mt-2 text-[15px] leading-snug italic">
                                                    « {tasting.note} »
                                                </p>
                                            )}
                                            <p className="mt-2 flex items-center gap-2 text-[12px] text-muted-foreground">
                                                {tasting.user && (
                                                    <MemberAvatar
                                                        id={tasting.user.id}
                                                        name={tasting.user.name}
                                                        size={20}
                                                    />
                                                )}
                                                {tasting.user?.name} ·{' '}
                                                {formatDate(tasting.createdAt)}{' '}
                                                · {timeAgo(tasting.createdAt)}
                                            </p>
                                            {tasting.rating === 5 &&
                                                tasting.wineId && (
                                                    <div className="relative z-10 mt-3">
                                                        {left > 0 ? (
                                                            <span className="text-[13px] font-semibold text-ready">
                                                                Encore {left} en
                                                                cave 🎉
                                                            </span>
                                                        ) : (
                                                            <Button
                                                                asChild
                                                                size="sm"
                                                                variant="outline"
                                                            >
                                                                <Link
                                                                    href={wines.create(
                                                                        {
                                                                            query: {
                                                                                from: tasting.wineId,
                                                                            },
                                                                        },
                                                                    )}
                                                                >
                                                                    <RotateCcw />
                                                                    Racheter
                                                                </Link>
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                        </div>
                                    </motion.article>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </>
            )}
        </>
    );
}

function Stat({
    value,
    label,
    suffix,
    emoji,
}: {
    value: number;
    label: string;
    suffix?: string;
    emoji?: string;
}) {
    return (
        <div className="surface p-4">
            <p className="font-display text-2xl font-extrabold tabular-nums">
                {emoji && <span className="mr-1">{emoji}</span>}
                {value.toLocaleString('fr-FR')}
                {suffix && (
                    <span className="text-base text-muted-foreground">
                        {suffix}
                    </span>
                )}
            </p>
            <p className="text-[12px] font-semibold text-muted-foreground">
                {label}
            </p>
        </div>
    );
}
