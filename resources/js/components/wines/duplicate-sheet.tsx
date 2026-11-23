import { Layers, MapPin, Plus } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatQuantity, useCatalog } from '@/lib/catalog';
import { cn } from '@/lib/utils';
import type { StockLot } from '@/types/models';

/**
 * Lots in stock of the same wine (same name, estate, vintage, format and
 * colour, compared like the server does) and the same « Ne pas boire »
 * choice: a gift never joins bottles meant to be drunk.
 */
export function sameWineLots(
    stock: StockLot[],
    wine: {
        name: string;
        producer: string | null;
        vintage: number | null;
        format: string;
        category: string;
        keepsake: boolean;
    },
): StockLot[] {
    const key = (lot: typeof wine) =>
        [
            lot.name.trim(),
            (lot.producer ?? '').trim(),
            lot.vintage ?? '',
            lot.format,
            lot.category,
        ]
            .join('|')
            .toLowerCase();

    if (wine.name.trim() === '') {
        return [];
    }

    return stock.filter(
        (lot) => key(lot) === key(wine) && lot.keepsake === wine.keepsake,
    );
}

/**
 * « Déjà dans ta cave » : the new bottles can join a lot already in stock,
 * or be stored apart.
 */
export function DuplicateSheet({
    open,
    onOpenChange,
    title,
    bottles,
    count,
    lots,
    target,
    targetId,
    placements,
    busy,
    onMerge,
    onSeparate,
    onElsewhere,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** « Château Talbot 2016 » */
    title: string;
    /** « 2 bouteilles » */
    bottles: string;
    /** Number of bottles being added. */
    count: number;
    lots: StockLot[];
    /** Place chosen in the form, if any. */
    target: string | null;
    targetId: number | null;
    /** Bottles the form sends to other places (kept when joining). */
    placements: { compartmentId: number; quantity: number }[];
    busy: boolean;
    onMerge: (lot: StockLot) => void;
    onSeparate: () => void;
    onElsewhere: () => void;
}) {
    const catalog = useCatalog();
    // A lot already in the chosen place is the obvious choice: first.
    const inTarget = (lot: StockLot) =>
        targetId !== null && lot.compartmentId === targetId;
    const sorted = [...lots].sort(
        (a, b) => Number(inTarget(b)) - Number(inTarget(a)),
    );
    const samePlace = lots.some(inTarget);
    // Bottles that stay in other places when joining this lot.
    const away = (lot: StockLot) =>
        placements
            .filter(
                (placement) =>
                    placement.compartmentId !== (lot.compartmentId ?? targetId),
            )
            .reduce((sum, placement) => sum + placement.quantity, 0);
    const split = sorted[0] ? away(sorted[0]) : 0;

    return (
        <BottomSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Déjà dans ta cave"
            description={`${title} y est déjà. Où ranger ${bottles} ?`}
        >
            <div className="space-y-2.5">
                {sorted.map((lot, index) => {
                    // A lot that lost its place (deleted cellar) takes the
                    // place chosen in the form: one must be chosen first.
                    const placeless = lot.compartmentId === null;
                    const blocked = placeless && target === null;

                    return (
                        <button
                            key={lot.id}
                            type="button"
                            disabled={busy || blocked}
                            onClick={() => onMerge(lot)}
                            className={cn(
                                'flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-[transform,background-color] active:scale-[0.98] disabled:opacity-60',
                                index === 0 && !blocked
                                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                                    : 'border-border bg-card hover:bg-accent/60',
                            )}
                        >
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                                {busy ? (
                                    <Spinner />
                                ) : (
                                    <Layers className="size-5" />
                                )}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-semibold">
                                    Avec{' '}
                                    {formatQuantity(
                                        catalog,
                                        lot.quantity,
                                        lot.format,
                                    )}{' '}
                                    déjà en cave
                                </span>
                                <span className="block text-[13px] text-muted-foreground">
                                    {blocked
                                        ? 'Sans emplacement : choisis d’abord où la ranger'
                                        : `${placeless ? target : lot.place} · ${lot.quantity + count - away(lot)} au total`}
                                </span>
                            </span>
                        </button>
                    );
                })}

                {target && !samePlace && (
                    <Button
                        variant="outline"
                        className="h-auto w-full justify-start gap-3 p-3.5 text-left whitespace-normal"
                        disabled={busy}
                        onClick={onSeparate}
                    >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                            <Plus className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block font-semibold">
                                Ranger à part
                            </span>
                            <span className="block truncate text-[13px] font-normal text-muted-foreground">
                                {target}
                            </span>
                        </span>
                    </Button>
                )}

                <p className="px-1 text-[12.5px] text-muted-foreground">
                    En les mettant ensemble, la fiche du vin en cave est gardée
                    et ce qu’elle ne précisait pas encore (prix, appellation,
                    photo…) est complété.
                    {split > 0 &&
                        ` La répartition prévue est gardée : ${formatQuantity(catalog, split, lots[0]?.format ?? 'standard')} ailleurs.`}
                </p>

                <Button
                    variant="ghost"
                    className="w-full"
                    disabled={busy}
                    onClick={onElsewhere}
                >
                    <MapPin />
                    {target
                        ? 'Choisir un autre emplacement'
                        : 'Choisir un emplacement'}
                </Button>
            </div>
        </BottomSheet>
    );
}
