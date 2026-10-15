import { router } from '@inertiajs/react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { StarRating } from '@/components/ui/pickers';
import { Stepper } from '@/components/ui/stepper';
import { LocationPill, WineAvatar } from '@/components/wines/wine-visuals';
import { vibrate } from '@/lib/celebrate';
import { formatQuantity, unitWord, useCatalog, wineTitle } from '@/lib/catalog';
import { cn } from '@/lib/utils';
import wines from '@/routes/wines';
import type { Wine } from '@/types/models';

const ratingWords = ['', 'Bof', 'Correct', 'Bon', 'Très bon', 'Coup de cœur !'];

/**
 * « Boire » : how many bottles, and optionally a rating and a tasting note
 * that go to the tasting notebook.
 */
export function DrinkSheet({
    wine,
    onClose,
}: {
    wine: Wine | null;
    onClose: () => void;
}) {
    return (
        <BottomSheet
            open={wine !== null}
            onOpenChange={(open) => !open && onClose()}
            title={wine ? wineTitle(wine) : 'Boire'}
            description={wine?.producer ?? undefined}
            hero={
                wine && (
                    <motion.div
                        initial={{ rotate: -14, scale: 0.7, opacity: 0 }}
                        animate={{ rotate: 0, scale: 1, opacity: 1 }}
                        transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 16,
                        }}
                    >
                        <WineAvatar
                            category={wine.category}
                            region={wine.region}
                            vintage={wine.vintage}
                            photoUrl={wine.photoUrl}
                            size="xl"
                            rounded="rounded-[28px]"
                        />
                    </motion.div>
                )
            }
        >
            {wine && <DrinkForm key={wine.id} wine={wine} onDone={onClose} />}
        </BottomSheet>
    );
}

function DrinkForm({ wine, onDone }: { wine: Wine; onDone: () => void }) {
    const catalog = useCatalog();
    const [quantity, setQuantity] = useState(1);
    const [rating, setRating] = useState<number | null>(null);
    const [note, setNote] = useState('');
    const [showNote, setShowNote] = useState(false);
    const [processing, setProcessing] = useState(false);
    const left = wine.quantity - quantity;
    const segments = Math.min(wine.quantity, 24);

    const submit = (amount: number) => {
        router.post(
            wines.drink.url(wine.id),
            { quantity: amount, rating, note: note.trim() || null },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    vibrate([12, 40, 12]);
                    onDone();
                },
            },
        );
    };

    return (
        <div className="space-y-5">
            <div className="flex justify-center">
                <LocationPill location={wine.location} link={false} />
            </div>

            {wine.quantity > 1 && (
                <div className="surface space-y-4 p-4">
                    <Stepper
                        value={quantity}
                        onChange={setQuantity}
                        min={1}
                        max={wine.quantity}
                        size="lg"
                        unit={unitWord(catalog, quantity, wine.format)}
                        label="Nombre de bouteilles"
                    />
                    {segments > 1 && (
                        <div className="flex gap-1" aria-hidden>
                            {Array.from({ length: segments }, (_, i) => (
                                <motion.span
                                    key={i}
                                    className="h-2 flex-1 rounded-full"
                                    animate={{
                                        backgroundColor:
                                            i <
                                            Math.round(
                                                (left / wine.quantity) *
                                                    segments,
                                            )
                                                ? 'var(--primary)'
                                                : 'var(--muted)',
                                        scaleY:
                                            i <
                                            Math.round(
                                                (left / wine.quantity) *
                                                    segments,
                                            )
                                                ? 1
                                                : 0.7,
                                    }}
                                    transition={{ duration: 0.25 }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            <p className="text-center text-[15px]">
                {left > 0 ? (
                    <>
                        Il en restera{' '}
                        <strong className="font-bold">
                            {formatQuantity(catalog, left, wine.format)}
                        </strong>
                    </>
                ) : (
                    <>C’est la dernière ! Pense à en racheter 🍷</>
                )}
            </p>

            <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-semibold text-muted-foreground">
                    Comment était-il ?
                </p>
                <StarRating value={rating} onChange={setRating} size="lg" />
                <p
                    className={cn(
                        'h-5 text-sm font-semibold',
                        rating ? 'text-foreground' : 'text-transparent',
                    )}
                >
                    {rating ? ratingWords[rating] : '—'}
                </p>
            </div>

            {showNote ? (
                <Textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Nez, bouche, avec quoi vous l’avez bu…"
                    maxLength={1000}
                    autoFocus
                    aria-label="Note de dégustation"
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setShowNote(true)}
                    className="w-full rounded-2xl border border-dashed border-border py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                    ✍️ Ajouter une note de dégustation
                </button>
            )}

            <div className="flex gap-2 pt-1">
                {wine.quantity > 1 && (
                    <Button
                        variant="outline"
                        size="lg"
                        disabled={processing}
                        onClick={() => submit(wine.quantity)}
                    >
                        Tout
                    </Button>
                )}
                <Button
                    size="lg"
                    className="min-w-0 flex-1"
                    disabled={processing}
                    onClick={() => submit(quantity)}
                >
                    🍷 Boire{' '}
                    {quantity > 1
                        ? formatQuantity(catalog, quantity, wine.format)
                        : 'cette bouteille'}
                </Button>
            </div>
        </div>
    );
}
