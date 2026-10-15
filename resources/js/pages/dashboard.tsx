import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Fingerprint, Plus, Wine as WineIcon } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { MovementEntry } from '@/components/activity/movement-entry';
import { CellarVisual, visualWidth } from '@/components/cellar/cellar-visual';
import { BottleRoulette } from '@/components/dashboard/bottle-roulette';
import { Bubbles } from '@/components/fx/aurora';
import { EmptyState, SectionTitle } from '@/components/page-header';
import { InstallBanner } from '@/components/pwa/install-banner';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Button } from '@/components/ui/button';
import { DrinkSheet } from '@/components/wines/drink-sheet';
import {
    LocationPill,
    WindowRing,
    WineAvatar,
} from '@/components/wines/wine-visuals';
import {
    findCategory,
    findCellarType,
    findColor,
    formatAmount,
    formatQuantity,
    gradient,
    useCatalog,
} from '@/lib/catalog';
import { formatLongToday, greeting, windowRingText } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { activity, tastings } from '@/routes';
import cellarRoutes from '@/routes/cellars';
import { edit as editSecurity } from '@/routes/security';
import wines from '@/routes/wines';
import type { Cellar, CategoryValue, Movement, Wine } from '@/types/models';

type Props = {
    stats: {
        items: number;
        units: number;
        urgent: number;
        ready: number;
        young: number;
        members: number;
        addedThisMonth: number;
        drunkThisMonth: number;
        valueCents: number | null;
        liters: number;
        capacity: number;
    };
    priority: Wine[];
    suggestions: Wine[];
    cellars: Cellar[];
    categories: { category: CategoryValue; units: number; items: number }[];
    regions: { region: string; units: number }[];
    vintages: { vintage: number; units: number }[];
    activity: Movement[];
    hasPasskey: boolean;
};

const section = {
    hidden: { opacity: 0, y: 18 },
    show: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 260, damping: 26 },
    },
} as const;

export default function Dashboard(props: Props) {
    const { auth, household } = usePage().props;
    const [drinking, setDrinking] = useState<Wine | null>(null);
    const firstName = auth.user?.name.split(' ')[0] ?? '';

    return (
        <>
            <Head title="Accueil" />

            <motion.div
                className="space-y-8"
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.07 } } }}
            >
                <motion.header variants={section}>
                    <p className="text-[13px] font-bold text-primary">
                        {formatLongToday()}
                    </p>
                    <h1 className="mt-1 font-display text-[28px] leading-tight font-extrabold tracking-tight lg:text-4xl">
                        {greeting()} {firstName}{' '}
                        <motion.span
                            className="inline-block origin-[70%_70%]"
                            animate={{ rotate: [0, 18, -8, 16, -4, 10, 0] }}
                            transition={{ duration: 1.6, delay: 0.4 }}
                        >
                            👋
                        </motion.span>
                    </h1>
                </motion.header>

                <motion.div variants={section}>
                    <InstallBanner />
                </motion.div>

                <motion.div
                    variants={section}
                    className="grid grid-cols-1 gap-4 lg:grid-cols-3"
                >
                    <Hero
                        stats={props.stats}
                        canSeePrices={household?.canSeePrices ?? false}
                    />
                    <BottleRoulette
                        pool={props.suggestions}
                        onDrink={setDrinking}
                    />
                </motion.div>

                {!props.hasPasskey && (
                    <motion.div variants={section}>
                        <Link
                            href={editSecurity()}
                            className="surface flex items-center gap-4 p-4 transition-shadow hover:shadow-float"
                        >
                            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-ready/15 text-ready">
                                <Fingerprint className="size-6" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-display font-bold">
                                    Active la connexion express
                                </span>
                                <span className="block text-[13px] text-muted-foreground">
                                    Face ID, empreinte ou code du téléphone :
                                    plus besoin de mot de passe.
                                </span>
                            </span>
                            <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
                        </Link>
                    </motion.div>
                )}

                <motion.section variants={section}>
                    <SectionTitle
                        title="À boire maintenant"
                        action={<Link href={wines.index()}>Tout voir →</Link>}
                    />
                    {props.stats.units === 0 ? (
                        <EmptyState
                            emoji="🍷"
                            title="La cave est vide"
                            description="Range ta première bouteille : on te dira quand elle sera à son apogée, et sur quelle clayette elle dort."
                            action={
                                <Button asChild variant="warm">
                                    <Link href={wines.create()}>
                                        <Plus />
                                        Ranger une bouteille
                                    </Link>
                                </Button>
                            }
                        />
                    ) : props.priority.length === 0 ? (
                        <div className="surface flex items-center gap-4 p-5">
                            <span className="text-4xl">🎉</span>
                            <p className="text-[15px]">
                                <strong>Rien ne presse.</strong>{' '}
                                <span className="text-muted-foreground">
                                    Toutes tes bouteilles ont encore de belles
                                    années devant elles.
                                </span>
                            </p>
                        </div>
                    ) : (
                        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
                            {props.priority.map((wine) => (
                                <PriorityCard
                                    key={wine.id}
                                    wine={wine}
                                    onDrink={setDrinking}
                                />
                            ))}
                        </div>
                    )}
                </motion.section>

                <motion.section variants={section}>
                    <SectionTitle
                        title="Mes caves"
                        action={
                            <Link href={cellarRoutes.index()}>Toutes →</Link>
                        }
                    />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {props.cellars.map((cellar) => (
                            <CellarTile key={cellar.id} cellar={cellar} />
                        ))}
                        <Link
                            href={cellarRoutes.create()}
                            className="flex min-h-[132px] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-border text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                        >
                            <Plus className="size-5" />
                            Nouvelle cave
                        </Link>
                    </div>
                </motion.section>

                {props.categories.length > 0 && (
                    <motion.section
                        variants={section}
                        className="grid grid-cols-1 gap-4 lg:grid-cols-3"
                    >
                        <div className="surface p-5 lg:col-span-1">
                            <h2 className="mb-4 font-display text-lg font-bold">
                                Ce qu’il y a dedans
                            </h2>
                            <CategoryBars categories={props.categories} />
                        </div>
                        <div className="surface p-5">
                            <h2 className="mb-4 font-display text-lg font-bold">
                                Par région
                            </h2>
                            <RegionBars regions={props.regions} />
                        </div>
                        <div className="surface p-5">
                            <h2 className="mb-4 font-display text-lg font-bold">
                                Millésimes
                            </h2>
                            <VintageChart vintages={props.vintages} />
                        </div>
                    </motion.section>
                )}

                <motion.section variants={section}>
                    <SectionTitle
                        title="Activité récente"
                        action={
                            <span className="flex gap-4">
                                <Link href={tastings()}>Dégustations</Link>
                                <Link href={activity()}>Historique →</Link>
                            </span>
                        }
                    />
                    <div className="surface space-y-5 p-5">
                        {props.activity.length === 0 ? (
                            <p className="text-center text-sm text-muted-foreground">
                                Rien pour l’instant : l’histoire de ta cave
                                commence ici.
                            </p>
                        ) : (
                            props.activity.map((movement) => (
                                <MovementEntry
                                    key={movement.id}
                                    movement={movement}
                                    compact
                                />
                            ))
                        )}
                    </div>
                </motion.section>
            </motion.div>

            <DrinkSheet wine={drinking} onClose={() => setDrinking(null)} />
        </>
    );
}

function Hero({
    stats,
    canSeePrices,
}: {
    stats: Props['stats'];
    canSeePrices: boolean;
}) {
    const { household } = usePage().props;
    const catalog = useCatalog();

    if (!household) {
        return null;
    }

    const fill =
        stats.capacity > 0
            ? Math.round((stats.units / stats.capacity) * 100)
            : null;

    return (
        <section
            className="relative overflow-hidden rounded-[32px] p-6 text-white shadow-float lg:col-span-2 lg:p-8"
            style={{
                background: gradient(findColor(catalog, household.color)),
            }}
        >
            <div className="hero-veil absolute inset-0" />
            <Bubbles count={14} seed={household.id} />

            <div className="relative">
                <p className="flex items-center gap-2 text-sm font-bold text-white/90">
                    <span>🍇</span>
                    <span>{household.emoji}</span>
                    <span className="truncate">{household.name}</span>
                </p>

                <div className="mt-4 flex items-end gap-3">
                    <AnimatedNumber
                        value={stats.units}
                        className="font-display text-[76px] leading-[0.85] font-extrabold tracking-tight lg:text-[96px]"
                    />
                    <p className="pb-2 font-display text-lg leading-tight font-bold text-white/90">
                        bouteille{stats.units > 1 ? 's' : ''}
                        <br />
                        en cave
                    </p>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
                    <HeroTile label="références" value={stats.items} />
                    <HeroTile
                        label="à boire vite"
                        value={stats.urgent}
                        badge={
                            stats.urgent > 0 && (
                                <span className="relative flex size-2">
                                    <span className="animate-pulse-dot absolute inset-0 rounded-full bg-amber-300" />
                                    <span className="relative size-2 rounded-full bg-amber-300" />
                                </span>
                            )
                        }
                    />
                    <HeroTile label="trop jeunes" value={stats.young} />
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] font-semibold text-white/90">
                    <span>+{stats.addedThisMonth} rangées ce mois-ci</span>
                    <span>−{stats.drunkThisMonth} bues ou offertes</span>
                    {stats.liters > 0 && (
                        <span>≈ {stats.liters.toLocaleString('fr-FR')} l</span>
                    )}
                    {fill !== null && <span>{fill} % de remplissage</span>}
                    {canSeePrices &&
                        stats.valueCents !== null &&
                        stats.valueCents > 0 && (
                            <span className="rounded-full bg-white/20 px-2.5 py-1 backdrop-blur">
                                Valeur estimée {formatAmount(stats.valueCents)}
                            </span>
                        )}
                </div>
            </div>
        </section>
    );
}

function HeroTile({
    label,
    value,
    badge,
}: {
    label: string;
    value: number;
    badge?: ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-white/25 bg-white/15 p-3 backdrop-blur-md">
            <div className="flex items-center gap-1.5">
                <AnimatedNumber
                    value={value}
                    className="font-display text-2xl font-extrabold"
                />
                {badge}
            </div>
            <p className="text-[12px] leading-tight font-semibold text-white/85">
                {label}
            </p>
        </div>
    );
}

function PriorityCard({
    wine,
    onDrink,
}: {
    wine: Wine;
    onDrink: (wine: Wine) => void;
}) {
    const catalog = useCatalog();
    const ring = windowRingText(wine.window);

    return (
        <article className="surface relative w-[230px] shrink-0 snap-start overflow-hidden p-3">
            <div className="relative">
                <WineAvatar
                    category={wine.category}
                    region={wine.region}
                    vintage={wine.vintage}
                    photoUrl={wine.photoUrl}
                    size="xl"
                    className="!h-[150px] !w-full"
                    rounded="rounded-[20px]"
                />
                <div className="absolute top-2 right-2 rounded-full bg-card/90 p-1 shadow-soft backdrop-blur">
                    <WindowRing window={wine.window} size={52} stroke={4.5}>
                        <span className="font-display text-[12px] font-extrabold">
                            {ring.value}
                        </span>
                    </WindowRing>
                </div>
            </div>
            <h3 className="mt-3 line-clamp-2 min-h-[2.5em] font-display text-[15px] leading-tight font-bold">
                <Link href={wines.show(wine.id)} className="stretched-link">
                    {wine.name}
                    {wine.vintage ? ` ${wine.vintage}` : ''}
                </Link>
            </h3>
            <p className="mt-1 text-[13px] text-muted-foreground">
                {formatQuantity(catalog, wine.quantity, wine.format)}
            </p>
            <div className="mt-2 flex min-w-0">
                <LocationPill location={wine.location} wineId={wine.id} />
            </div>
            <Button
                size="sm"
                className="relative z-10 mt-3 w-full"
                onClick={() => onDrink(wine)}
            >
                <WineIcon />
                Boire
            </Button>
        </article>
    );
}

function CellarTile({ cellar }: { cellar: Cellar }) {
    const catalog = useCatalog();
    const type = findCellarType(catalog, cellar.type);
    const fill =
        cellar.stats.capacity > 0
            ? Math.min(
                  100,
                  Math.round(
                      (cellar.stats.units / cellar.stats.capacity) * 100,
                  ),
              )
            : null;

    return (
        <Link
            href={cellarRoutes.show(cellar.id)}
            className="surface flex items-center gap-4 p-4 transition-transform hover:-translate-y-1 hover:shadow-float"
        >
            <div className="flex h-[108px] w-[100px] shrink-0 items-center justify-center">
                <div
                    style={{
                        transform: `scale(${Math.min(0.8, 100 / visualWidth(cellar.type, 'sm'))})`,
                    }}
                >
                    <CellarVisual
                        type={cellar.type}
                        color={cellar.color}
                        size="sm"
                        compartments={cellar.compartments}
                    />
                </div>
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[16px] font-bold">
                    {cellar.name}
                </p>
                <p className="text-[13px] text-muted-foreground">
                    {cellar.stats.units} bouteille
                    {cellar.stats.units > 1 ? 's' : ''} ·{' '}
                    {cellar.compartments.length}{' '}
                    {cellar.compartments.length > 1
                        ? type.compartmentPlural
                        : type.compartment.toLowerCase()}
                </p>
                {fill !== null && (
                    <div className="mt-2 flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <span
                                className="block h-full rounded-full"
                                style={{
                                    width: `${fill}%`,
                                    background: gradient(
                                        findColor(catalog, cellar.color),
                                        90,
                                    ),
                                }}
                            />
                        </span>
                        <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
                            {fill} %
                        </span>
                    </div>
                )}
            </div>
        </Link>
    );
}

function CategoryBars({ categories }: { categories: Props['categories'] }) {
    const catalog = useCatalog();
    const max = Math.max(...categories.map((item) => item.units), 1);

    return (
        <ul className="space-y-3">
            {categories.slice(0, 7).map((item, index) => {
                const category = findCategory(catalog, item.category);

                return (
                    <li key={item.category}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                            <span className="flex items-center gap-2 font-semibold">
                                <span>{category.emoji}</span>
                                {category.label}
                            </span>
                            <span className="font-bold tabular-nums">
                                {item.units}
                            </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <motion.div
                                className="h-full rounded-full"
                                style={{ background: category.color }}
                                initial={{ width: 0 }}
                                animate={{
                                    width: `${(item.units / max) * 100}%`,
                                }}
                                transition={{
                                    duration: 0.9,
                                    delay: 0.2 + index * 0.06,
                                    ease: [0.16, 1, 0.3, 1],
                                }}
                            />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

function RegionBars({ regions }: { regions: Props['regions'] }) {
    if (regions.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                Indique la région de tes vins pour voir ta carte des vignobles.
            </p>
        );
    }

    const max = Math.max(...regions.map((item) => item.units), 1);

    return (
        <ul className="space-y-3">
            {regions.map((item, index) => (
                <li key={item.region}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-semibold">
                            {item.region}
                        </span>
                        <span className="font-bold tabular-nums">
                            {item.units}
                        </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <motion.div
                            className="bg-gradient-primary h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(item.units / max) * 100}%` }}
                            transition={{
                                duration: 0.9,
                                delay: 0.2 + index * 0.06,
                                ease: [0.16, 1, 0.3, 1],
                            }}
                        />
                    </div>
                </li>
            ))}
        </ul>
    );
}

function VintageChart({ vintages }: { vintages: Props['vintages'] }) {
    if (vintages.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                Aucun millésime renseigné pour l’instant.
            </p>
        );
    }

    const first = vintages[0].vintage;
    const last = vintages[vintages.length - 1].vintage;
    const span = Math.min(30, last - first + 1);
    const start = last - span + 1;
    const byYear = new Map(vintages.map((item) => [item.vintage, item.units]));
    const older = vintages
        .filter((item) => item.vintage < start)
        .reduce((sum, item) => sum + item.units, 0);
    const years = Array.from({ length: span }, (_, i) => start + i);
    const max = Math.max(
        ...years.map((year) => byYear.get(year) ?? 0),
        older,
        1,
    );
    const oldest = vintages[0];

    return (
        <div>
            <div
                className="flex h-32 items-end gap-[3px]"
                role="img"
                aria-label="Bouteilles par millésime"
            >
                {older > 0 && (
                    <Bar
                        label={`Avant ${start}`}
                        units={older}
                        max={max}
                        index={0}
                        className="bg-foreground/30"
                    />
                )}
                {years.map((year, index) => (
                    <Bar
                        key={year}
                        label={String(year)}
                        units={byYear.get(year) ?? 0}
                        max={max}
                        index={index + 1}
                    />
                ))}
            </div>
            <div className="mt-2 flex justify-between text-[11px] font-semibold text-muted-foreground tabular-nums">
                <span>{older > 0 ? `< ${start}` : start}</span>
                <span>{last}</span>
            </div>
            <p className="mt-3 text-[13px] text-muted-foreground">
                Le doyen :{' '}
                <strong className="text-foreground">{oldest.vintage}</strong>
            </p>
        </div>
    );
}

function Bar({
    label,
    units,
    max,
    index,
    className,
}: {
    label: string;
    units: number;
    max: number;
    index: number;
    className?: string;
}) {
    return (
        <div
            className="group relative flex h-full flex-1 items-end"
            title={`${label} : ${units} bouteille${units > 1 ? 's' : ''}`}
        >
            <motion.div
                className={cn(
                    'w-full rounded-t-[4px]',
                    units === 0
                        ? 'bg-muted'
                        : (className ?? 'bg-gradient-primary'),
                )}
                initial={{ height: 0 }}
                animate={{
                    height:
                        units === 0
                            ? 3
                            : `${Math.max(6, (units / max) * 100)}%`,
                }}
                transition={{
                    duration: 0.8,
                    delay: 0.2 + index * 0.02,
                    ease: [0.16, 1, 0.3, 1],
                }}
            />
        </div>
    );
}
