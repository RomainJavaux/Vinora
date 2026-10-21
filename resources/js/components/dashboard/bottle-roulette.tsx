import { RotateCcw, Sparkles, Wine as WineIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    LocationPill,
    WindowBadge,
    WineAvatar,
} from '@/components/wines/wine-visuals';
import { vibrate } from '@/lib/celebrate';
import { formatQuantity, useCatalog, wineTitle } from '@/lib/catalog';
import { cn } from '@/lib/utils';
import type { DishOption, Wine, WindowStatus } from '@/types/models';

const STATUS_WEIGHT: Record<WindowStatus, number> = {
    soon: 4,
    past: 3,
    ready: 2,
    unknown: 1,
    young: 0,
    // Gifts and souvenirs are never drawn.
    keep: 0,
};

function weightOf(wine: Wine, dish: DishOption | null): number {
    const status = STATUS_WEIGHT[wine.window.status];
    const pairing = dish ? (dish.weights[wine.category] ?? 0) : 1;

    return status * pairing;
}

function draw(
    pool: Wine[],
    dish: DishOption | null,
    exclude?: number,
): Wine | null {
    const candidates = pool.filter((wine) => weightOf(wine, dish) > 0);
    const list =
        candidates.length > 1 && exclude
            ? candidates.filter((wine) => wine.id !== exclude)
            : candidates;
    const total = list.reduce((sum, wine) => sum + weightOf(wine, dish), 0);

    if (total === 0) {
        return null;
    }

    let ticket = Math.random() * total;

    for (const wine of list) {
        ticket -= weightOf(wine, dish);

        if (ticket <= 0) {
            return wine;
        }
    }

    return list[list.length - 1] ?? null;
}

/**
 * « Quelle bouteille ce soir ? » : a weighted draw that favours wines at
 * the end of their window, optionally filtered by what is on the table.
 */
export function BottleRoulette({
    pool,
    onDrink,
}: {
    pool: Wine[];
    onDrink: (wine: Wine) => void;
}) {
    const catalog = useCatalog();
    const [dish, setDish] = useState<DishOption | null>(null);
    const [shown, setShown] = useState<Wine | null>(null);
    const [result, setResult] = useState<Wine | null>(null);
    const [spinning, setSpinning] = useState(false);
    const [empty, setEmpty] = useState(false);
    const [frame, setFrame] = useState(0);
    const timer = useRef<number | null>(null);

    useEffect(
        () => () => {
            if (timer.current !== null) {
                window.clearTimeout(timer.current);
            }
        },
        [],
    );

    const spin = (forDish: DishOption | null = dish) => {
        if (spinning) {
            return;
        }

        const winner = draw(pool, forDish, result?.id);

        if (!winner) {
            setResult(null);
            setShown(null);
            setEmpty(true);

            return;
        }

        setEmpty(false);
        setSpinning(true);
        setResult(null);

        const steps = 14;
        let step = 0;

        const tick = () => {
            step += 1;

            if (step >= steps) {
                setShown(winner);
                setFrame((value) => value + 1);
                setResult(winner);
                setSpinning(false);
                vibrate(18);

                return;
            }

            setShown(pool[Math.floor(Math.random() * pool.length)] ?? winner);
            setFrame((value) => value + 1);
            vibrate(4);
            timer.current = window.setTimeout(tick, 45 + step * step * 2.2);
        };

        tick();
    };

    const resting = pool.slice(0, 4);

    return (
        <section className="surface flex h-full flex-col overflow-hidden p-5">
            <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-bold">
                    Quelle bouteille ce soir ?
                </h2>
                <motion.span
                    animate={spinning ? { rotate: 360 } : { rotate: 0 }}
                    transition={
                        spinning
                            ? {
                                  duration: 0.6,
                                  repeat: Infinity,
                                  ease: 'linear',
                              }
                            : { duration: 0.3 }
                    }
                    className="text-xl"
                    aria-hidden
                >
                    🍾
                </motion.span>
            </div>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
                On mange quoi ? On te trouve l’accord.
            </p>

            {pool.length > 0 && (
                <div className="no-scrollbar -mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5">
                    <DishChip
                        active={dish === null}
                        onClick={() => setDish(null)}
                    >
                        ✨ Surprends-moi
                    </DishChip>
                    {catalog.dishes.map((option) => (
                        <DishChip
                            key={option.value}
                            active={dish?.value === option.value}
                            onClick={() => {
                                setDish(option);
                                setResult(null);
                                setShown(null);
                                setEmpty(false);
                            }}
                        >
                            {option.emoji} {option.label}
                        </DishChip>
                    ))}
                </div>
            )}

            <div className="relative mt-4 flex min-h-[148px] flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl bg-muted/50 p-4">
                {pool.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">
                        Range quelques bouteilles prêtes à boire et on te fera
                        des suggestions ✨
                    </p>
                ) : empty ? (
                    <p className="text-center text-sm text-muted-foreground">
                        Rien d’idéal pour ça en ce moment… essaie un autre plat
                        🍽️
                    </p>
                ) : shown ? (
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.div
                            key={frame}
                            className="flex w-full items-center gap-3"
                            initial={{
                                y: -26,
                                opacity: 0,
                                filter: 'blur(6px)',
                            }}
                            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                            exit={{ y: 26, opacity: 0, filter: 'blur(6px)' }}
                            transition={{ duration: spinning ? 0.08 : 0.3 }}
                        >
                            <WineAvatar
                                category={shown.category}
                                region={shown.region}
                                vintage={shown.vintage}
                                photoUrl={shown.photoUrl}
                                size="lg"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-display text-[17px] leading-tight font-extrabold">
                                    {wineTitle(shown)}
                                </p>
                                {shown.producer && (
                                    <p className="truncate text-[13px] text-muted-foreground">
                                        {shown.producer}
                                    </p>
                                )}
                                {!spinning && result && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="mt-2 flex flex-wrap gap-1.5"
                                    >
                                        <span className="text-[13px] font-bold">
                                            {formatQuantity(
                                                catalog,
                                                result.quantity,
                                                result.format,
                                            )}{' '}
                                            dispo
                                        </span>
                                        <WindowBadge window={result.window} />
                                        <LocationPill
                                            location={result.location}
                                            wineId={result.id}
                                        />
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                ) : (
                    <div className="flex items-end gap-2">
                        {resting.map((wine, index) => (
                            <motion.span
                                key={wine.id}
                                animate={{ y: [0, -8, 0] }}
                                transition={{
                                    duration: 1.4,
                                    repeat: Infinity,
                                    delay: index * 0.18,
                                }}
                            >
                                <WineAvatar
                                    category={wine.category}
                                    region={wine.region}
                                    size="md"
                                    className="bg-transparent"
                                />
                            </motion.span>
                        ))}
                    </div>
                )}
            </div>

            {pool.length > 0 && (
                <div className="mt-4 flex gap-2">
                    {result ? (
                        <>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => spin()}
                                aria-label="Une autre idée"
                            >
                                <RotateCcw />
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={() => onDrink(result)}
                            >
                                <WineIcon />
                                Je l’ouvre
                            </Button>
                        </>
                    ) : (
                        <Button
                            className="flex-1"
                            onClick={() => spin()}
                            disabled={spinning}
                        >
                            <Sparkles />
                            {spinning
                                ? 'Je cherche…'
                                : 'Trouve-moi une bouteille'}
                        </Button>
                    )}
                </div>
            )}
        </section>
    );
}

function DishChip({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={cn(
                'h-8 shrink-0 rounded-full border px-3 text-[13px] font-semibold whitespace-nowrap transition-colors',
                active
                    ? 'border-transparent bg-foreground text-background'
                    : 'border-border bg-card hover:bg-accent',
            )}
        >
            {children}
        </button>
    );
}
