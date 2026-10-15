import { Head, Link } from '@inertiajs/react';
import { Droplets, Plus, Settings2, Thermometer } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import { CellarVisual } from '@/components/cellar/cellar-visual';
import { PageHeader } from '@/components/page-header';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Button } from '@/components/ui/button';
import { DrinkSheet } from '@/components/wines/drink-sheet';
import { WineRow } from '@/components/wines/wine-row';
import { vibrate } from '@/lib/celebrate';
import {
    bottles,
    findCellarType,
    findColor,
    gradient,
    useCatalog,
} from '@/lib/catalog';
import { cn } from '@/lib/utils';
import cellarRoutes from '@/routes/cellars';
import wines from '@/routes/wines';
import type { Cellar, Compartment, Wine } from '@/types/models';

type Props = {
    cellar: Cellar;
    focus: { compartment: number | null; item: number | null };
    otherCellars: { id: number; name: string; type: string; color: string }[];
};

function initialCompartment(
    cellar: Cellar,
    focus: Props['focus'],
): number | null {
    if (
        focus.compartment &&
        cellar.compartments.some((c) => c.id === focus.compartment)
    ) {
        return focus.compartment;
    }

    return (
        (cellar.compartments.find((c) => c.units > 0) ?? cellar.compartments[0])
            ?.id ?? null
    );
}

export default function CellarShow({ cellar, focus }: Props) {
    const catalog = useCatalog();
    const type = findCellarType(catalog, cellar.type);
    const color = findColor(catalog, cellar.color);
    const [selectedId, setSelectedId] = useState<number | null>(() =>
        initialCompartment(cellar, focus),
    );
    const [drinking, setDrinking] = useState<Wine | null>(null);
    const panel = useRef<HTMLDivElement>(null);
    const pillsId = useId();

    const selected: Compartment | undefined =
        cellar.compartments.find((c) => c.id === selectedId) ??
        cellar.compartments[0];
    const items = selected?.items ?? [];

    // « Où est-elle ? » : bring the highlighted bottle to the middle of the screen.
    useEffect(() => {
        if (!focus.item) {
            return;
        }

        const timer = window.setTimeout(() => {
            document
                .querySelector(`[data-wine="${focus.item}"]`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 900);

        return () => window.clearTimeout(timer);
    }, [focus.item]);

    const select = (id: number) => {
        setSelectedId(id);
        vibrate(6);

        if (window.matchMedia('(max-width: 1023px)').matches) {
            window.setTimeout(
                () =>
                    panel.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                    }),
                250,
            );
        }
    };

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
        <>
            <Head title={cellar.name} />

            <PageHeader
                back={{ href: cellarRoutes.index(), label: 'Mes caves' }}
                overline={`🗄️ ${type.label}${cellar.location ? ` · ${cellar.location}` : ''}`}
                title={cellar.name}
                actions={
                    <>
                        <Button asChild variant="outline">
                            <Link href={cellarRoutes.edit(cellar.id)}>
                                <Settings2 />
                                Configurer
                            </Link>
                        </Button>
                        <Button asChild variant="warm">
                            <Link
                                href={wines.create({
                                    query: selected
                                        ? { compartment: selected.id }
                                        : {},
                                })}
                            >
                                <Plus />
                                Ranger ici
                            </Link>
                        </Button>
                    </>
                }
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-10">
                <div className="lg:sticky lg:top-10 lg:self-start">
                    <div className="relative px-2 py-6">
                        <div
                            className="pointer-events-none absolute inset-0 rounded-[40px] opacity-40"
                            style={{
                                background: `radial-gradient(circle at 50% 45%, ${color.from}, transparent 62%)`,
                            }}
                        />
                        <CellarVisual
                            type={cellar.type}
                            color={cellar.color}
                            name={cellar.name}
                            size="lg"
                            animateOpening
                            temperature={cellar.temperature}
                            compartments={cellar.compartments}
                            selectedId={selected?.id ?? null}
                            highlightId={focus.item ? focus.compartment : null}
                            onSelect={(id) => select(Number(id))}
                        />
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2">
                        <MiniStat
                            label="bouteilles"
                            value={cellar.stats.units}
                        />
                        <MiniStat
                            label="références"
                            value={cellar.stats.items}
                        />
                        <MiniStat
                            label="à boire vite"
                            value={cellar.stats.urgent}
                            warn={cellar.stats.urgent > 0}
                        />
                    </div>

                    {fill !== null && (
                        <div className="surface mt-3 p-4">
                            <div className="mb-2 flex items-center justify-between text-sm">
                                <span className="font-semibold">
                                    Remplissage
                                </span>
                                <span className="font-bold tabular-nums">
                                    {cellar.stats.units} /{' '}
                                    {cellar.stats.capacity} places
                                </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{ background: gradient(color, 90) }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${fill}%` }}
                                    transition={{
                                        duration: 0.9,
                                        ease: [0.16, 1, 0.3, 1],
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <Climate cellar={cellar} />
                </div>

                <div ref={panel} className="min-w-0 scroll-mt-24">
                    <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
                        {cellar.compartments.map((compartment) => {
                            const active = compartment.id === selected?.id;

                            return (
                                <button
                                    key={compartment.id}
                                    type="button"
                                    onClick={() => select(compartment.id)}
                                    className={cn(
                                        'relative flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
                                        active
                                            ? 'border-transparent text-white'
                                            : 'border-border bg-card hover:bg-accent/60',
                                    )}
                                >
                                    {active && (
                                        <motion.span
                                            layoutId={`${pillsId}-pill`}
                                            className="absolute inset-0 rounded-full"
                                            style={{
                                                background: gradient(color),
                                            }}
                                            transition={{
                                                type: 'spring',
                                                stiffness: 500,
                                                damping: 38,
                                            }}
                                        />
                                    )}
                                    <span className="relative">
                                        {compartment.name}
                                    </span>
                                    <span
                                        className={cn(
                                            'relative rounded-full px-1.5 text-[11px] font-bold tabular-nums',
                                            active ? 'bg-white/25' : 'bg-muted',
                                        )}
                                    >
                                        {compartment.units}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <AnimatePresence mode="wait">
                        {selected && (
                            <motion.section
                                key={selected.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.25 }}
                                className="surface relative overflow-hidden"
                            >
                                <div
                                    className="wood-texture h-2"
                                    style={{
                                        boxShadow:
                                            'inset 0 -2px 0 rgb(0 0 0 / 0.15)',
                                    }}
                                />
                                <div
                                    className="absolute inset-x-0 top-0 h-1"
                                    style={{ background: gradient(color, 90) }}
                                />
                                <div className="flex items-center justify-between gap-3 p-5 pb-3">
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                                            {type.compartment}{' '}
                                            {selected.position}
                                        </p>
                                        <h2 className="truncate font-display text-xl font-extrabold">
                                            {selected.name}
                                        </h2>
                                        <p className="text-[13px] text-muted-foreground">
                                            {bottles(selected.units)}
                                            {selected.capacity
                                                ? ` sur ${selected.capacity} places`
                                                : ''}
                                            {selected.urgentCount > 0 && (
                                                <span className="font-semibold text-soon">
                                                    {' '}
                                                    · {selected.urgentCount} à
                                                    boire vite
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <Button asChild size="sm" variant="outline">
                                        <Link
                                            href={wines.create({
                                                query: {
                                                    compartment: selected.id,
                                                },
                                            })}
                                        >
                                            <Plus />
                                            Ajouter
                                        </Link>
                                    </Button>
                                </div>

                                <div className="space-y-2.5 p-3 pt-1 sm:p-4 sm:pt-1">
                                    {items.length === 0 ? (
                                        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                                            <motion.span
                                                className="text-5xl"
                                                animate={{
                                                    y: [0, -6, 0],
                                                    rotate: [0, -6, 6, 0],
                                                }}
                                                transition={{
                                                    duration: 4,
                                                    repeat: Infinity,
                                                }}
                                            >
                                                🍷
                                            </motion.span>
                                            <p className="font-display text-lg font-bold">
                                                Rien ici pour l’instant
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Cette{' '}
                                                {type.compartment.toLowerCase()}{' '}
                                                n’attend que tes bouteilles.
                                            </p>
                                        </div>
                                    ) : (
                                        <AnimatePresence mode="popLayout">
                                            {items.map((wine, index) => (
                                                <WineRow
                                                    key={wine.id}
                                                    wine={wine}
                                                    index={index}
                                                    onDrink={setDrinking}
                                                    showLocation={false}
                                                    highlighted={
                                                        wine.id === focus.item
                                                    }
                                                />
                                            ))}
                                        </AnimatePresence>
                                    )}
                                </div>
                            </motion.section>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <DrinkSheet wine={drinking} onClose={() => setDrinking(null)} />
        </>
    );
}

function MiniStat({
    label,
    value,
    warn = false,
}: {
    label: string;
    value: number;
    warn?: boolean;
}) {
    return (
        <div
            className={cn(
                'surface rounded-2xl p-3 text-center',
                warn && 'bg-soon/10',
            )}
        >
            <AnimatedNumber
                value={value}
                className={cn(
                    'font-display text-2xl font-extrabold',
                    warn && 'text-soon',
                )}
            />
            <p className="text-[11.5px] font-semibold text-muted-foreground">
                {label}
            </p>
        </div>
    );
}

function Climate({ cellar }: { cellar: Cellar }) {
    if (cellar.temperature === null && cellar.humidity === null) {
        return null;
    }

    const temperature = cellar.temperature;
    const humidity = cellar.humidity;
    const service = cellar.type === 'service';

    const temperatureAdvice =
        temperature === null
            ? null
            : service
              ? 'Température de service'
              : temperature < 10
                ? 'Un peu frais : le vin évolue plus lentement'
                : temperature <= 14
                  ? 'Idéal pour la garde 👌'
                  : temperature <= 18
                    ? 'Un peu chaud pour une longue garde'
                    : 'Trop chaud : le vin vieillit trop vite ⚠️';

    const humidityAdvice =
        humidity === null
            ? null
            : humidity < 60
              ? 'Air sec : les bouchons risquent de sécher'
              : humidity <= 80
                ? 'Hygrométrie parfaite'
                : 'Très humide : attention aux étiquettes';

    const warn =
        (temperature !== null &&
            !service &&
            (temperature > 14 || temperature < 8)) ||
        (humidity !== null && (humidity < 60 || humidity > 85));

    return (
        <div
            className={cn(
                'surface mt-3 space-y-2 p-4',
                warn && 'ring-1 ring-soon/50',
            )}
        >
            {temperature !== null && (
                <p className="flex items-center gap-2 text-sm">
                    <Thermometer className="size-4 text-primary" />
                    <strong className="tabular-nums">
                        {temperature.toLocaleString('fr-FR')} °C
                    </strong>
                    <span className="text-muted-foreground">
                        · {temperatureAdvice}
                    </span>
                </p>
            )}
            {humidity !== null && (
                <p className="flex items-center gap-2 text-sm">
                    <Droplets className="size-4 text-young" />
                    <strong className="tabular-nums">{humidity} %</strong>
                    <span className="text-muted-foreground">
                        · {humidityAdvice}
                    </span>
                </p>
            )}
            {cellar.notes && (
                <p className="border-t border-hairline pt-2 text-[13px] text-muted-foreground">
                    {cellar.notes}
                </p>
            )}
        </div>
    );
}
