import type { RequestPayload } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { useLayoutEffect, useState } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Stepper } from '@/components/ui/stepper';
import { LocationPicker } from '@/components/wines/location-picker';
import {
    LABEL_FORMATS,
    PX_PER_MM,
    WineLabel,
    useWineQr,
} from '@/components/wines/print-label';
import type { LabelFormat } from '@/components/wines/print-label';
import { WineAvatar } from '@/components/wines/wine-visuals';
import { formatQuantity, unitWord, useCatalog, wineTitle } from '@/lib/catalog';
import wines from '@/routes/wines';
import type { CellarOption, Wine } from '@/types/models';

type SheetProps = {
    wine: Wine;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

const post = (
    url: string,
    data: RequestPayload,
    done: () => void,
    setBusy: (busy: boolean) => void,
) =>
    router.post(url, data, {
        preserveScroll: true,
        onStart: () => setBusy(true),
        onFinish: () => setBusy(false),
        onSuccess: done,
    });

/* Offrir ------------------------------------------------------------- */

export function GiftSheet({ wine, open, onOpenChange }: SheetProps) {
    const catalog = useCatalog();
    const [quantity, setQuantity] = useState(1);
    const [recipient, setRecipient] = useState('');
    const [busy, setBusy] = useState(false);

    return (
        <BottomSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Offrir une bouteille 🎁"
            description={`${wineTitle(wine)} · ${formatQuantity(catalog, wine.quantity, wine.format)} en cave`}
            footer={
                <Button
                    size="lg"
                    className="w-full"
                    disabled={busy}
                    onClick={() =>
                        post(
                            wines.gift.url(wine.id),
                            { quantity, recipient: recipient.trim() || null },
                            () => onOpenChange(false),
                            setBusy,
                        )
                    }
                >
                    Offrir {formatQuantity(catalog, quantity, wine.format)}
                </Button>
            }
        >
            <div className="space-y-5">
                {wine.quantity > 1 && (
                    <div className="surface p-4">
                        <Stepper
                            value={quantity}
                            onChange={setQuantity}
                            max={wine.quantity}
                            size="lg"
                            unit={unitWord(catalog, quantity, wine.format)}
                        />
                    </div>
                )}
                <div className="space-y-2">
                    <label
                        htmlFor="gift-recipient"
                        className="text-sm font-semibold"
                    >
                        À qui ?{' '}
                        <span className="font-normal text-muted-foreground">
                            (facultatif)
                        </span>
                    </label>
                    <Input
                        id="gift-recipient"
                        value={recipient}
                        onChange={(event) => setRecipient(event.target.value)}
                        placeholder="Paul & Léa, pour leur crémaillère"
                        maxLength={120}
                    />
                </div>
            </div>
        </BottomSheet>
    );
}

/* Rajouter ----------------------------------------------------------- */

export function RestockSheet({ wine, open, onOpenChange }: SheetProps) {
    const catalog = useCatalog();
    const [quantity, setQuantity] = useState(wine.initialQuantity >= 6 ? 6 : 1);
    const [busy, setBusy] = useState(false);

    return (
        <BottomSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Rajouter des bouteilles"
            description={`Même vin, même millésime : ${wineTitle(wine)}`}
            footer={
                <Button
                    variant="warm"
                    size="lg"
                    className="w-full"
                    disabled={busy}
                    onClick={() =>
                        post(
                            wines.restock.url(wine.id),
                            { quantity },
                            () => onOpenChange(false),
                            setBusy,
                        )
                    }
                >
                    Ajouter {formatQuantity(catalog, quantity, wine.format)}
                </Button>
            }
        >
            <div className="surface space-y-4 p-4">
                <Stepper
                    value={quantity}
                    onChange={setQuantity}
                    max={999}
                    size="lg"
                    unit={unitWord(catalog, quantity, wine.format)}
                />
                <div className="flex flex-wrap justify-center gap-2">
                    {[1, 2, 3, 6, 12].map((value) => (
                        <Chip
                            key={value}
                            size="sm"
                            active={quantity === value}
                            onClick={() => setQuantity(value)}
                        >
                            {value}
                        </Chip>
                    ))}
                </div>
            </div>
        </BottomSheet>
    );
}

/* Déplacer ----------------------------------------------------------- */

export function MoveSheet({
    wine,
    open,
    onOpenChange,
    cellars,
}: SheetProps & { cellars: CellarOption[] }) {
    const catalog = useCatalog();
    const [target, setTarget] = useState<number | null>(null);
    const [quantity, setQuantity] = useState(wine.quantity);
    const [busy, setBusy] = useState(false);
    const same = target === wine.compartmentId;

    return (
        <BottomSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Déplacer"
            description="Monte quelques bouteilles dans la cave de service, ou range tout ailleurs."
            footer={
                <Button
                    size="lg"
                    className="w-full"
                    disabled={busy || target === null || same}
                    onClick={() =>
                        target !== null &&
                        post(
                            wines.move.url(wine.id),
                            { compartment_id: target, quantity },
                            () => onOpenChange(false),
                            setBusy,
                        )
                    }
                >
                    {same
                        ? 'Elle est déjà ici'
                        : quantity < wine.quantity
                          ? `Déplacer ${formatQuantity(catalog, quantity, wine.format)}`
                          : 'Déplacer ici'}
                </Button>
            }
        >
            <div className="space-y-5">
                {wine.quantity > 1 && (
                    <div className="surface p-4">
                        <p className="mb-3 text-center text-sm font-semibold text-muted-foreground">
                            Combien en déplacer ?
                        </p>
                        <Stepper
                            value={quantity}
                            onChange={setQuantity}
                            max={wine.quantity}
                            unit={unitWord(catalog, quantity, wine.format)}
                        />
                    </div>
                )}
                <LocationPicker
                    cellars={cellars}
                    value={target ?? wine.compartmentId}
                    onChange={setTarget}
                    extra={target !== null && !same ? quantity : 0}
                />
            </div>
        </BottomSheet>
    );
}

/* Jeter -------------------------------------------------------------- */

export function DiscardSheet({ wine, open, onOpenChange }: SheetProps) {
    const catalog = useCatalog();
    const [reason, setReason] = useState('corked');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    return (
        <BottomSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Sortir de la cave"
            description={`Les ${formatQuantity(catalog, wine.quantity, wine.format)} restantes seront comptées comme perdues.`}
            hero={<span className="text-5xl">🗑️</span>}
            footer={
                <Button
                    variant="destructive"
                    size="lg"
                    className="w-full"
                    disabled={busy}
                    onClick={() =>
                        post(
                            wines.discard.url(wine.id),
                            { reason, note: note.trim() || null },
                            () => onOpenChange(false),
                            setBusy,
                        )
                    }
                >
                    Jeter{' '}
                    {wine.quantity > 1 ? 'les bouteilles' : 'la bouteille'}
                </Button>
            }
        >
            <div className="space-y-4">
                <div className="flex flex-wrap justify-center gap-2">
                    {catalog.discardReasons.map((option) => (
                        <Chip
                            key={option.value}
                            emoji={option.emoji}
                            active={reason === option.value}
                            color="var(--destructive)"
                            onClick={() => setReason(option.value)}
                        >
                            {option.label}
                        </Chip>
                    ))}
                </div>
                <Input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Une précision ? (facultatif)"
                    maxLength={200}
                />
            </div>
        </BottomSheet>
    );
}

/* Supprimer ---------------------------------------------------------- */

export function DeleteSheet({ wine, open, onOpenChange }: SheetProps) {
    const [busy, setBusy] = useState(false);

    return (
        <BottomSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Supprimer définitivement ?"
            description="Pour une bouteille bue, offerte ou bouchonnée, utilise plutôt « Boire », « Offrir » ou « Jeter » : l’historique et les statistiques resteront justes."
            footer={
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="lg"
                        className="flex-1"
                        onClick={() => onOpenChange(false)}
                    >
                        Annuler
                    </Button>
                    <Button
                        variant="destructive"
                        size="lg"
                        className="flex-1"
                        disabled={busy}
                        onClick={() =>
                            router.delete(wines.destroy.url(wine.id), {
                                onStart: () => setBusy(true),
                                onFinish: () => setBusy(false),
                            })
                        }
                    >
                        Supprimer
                    </Button>
                </div>
            }
        >
            <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
                <WineAvatar
                    category={wine.category}
                    region={wine.region}
                    photoUrl={wine.photoUrl}
                    size="sm"
                />
                <span className="font-semibold">{wineTitle(wine)}</span>
            </div>
        </BottomSheet>
    );
}

/* Étiquette à imprimer ----------------------------------------------- */

/**
 * Pick a label model, preview it at real size and open the print page.
 */
export function LabelSheet({ wine, open, onOpenChange }: SheetProps) {
    const [format, setFormat] = useState<LabelFormat>('detailed');
    const qr = useWineQr(wine);
    const { width, height } = LABEL_FORMATS[format];
    const [space, setSpace] = useState<number | null>(null);
    // The sheet mounts its content after opening: measure once it is there.
    const [box, setBox] = useState<HTMLDivElement | null>(null);

    // On a phone the 90 mm label is wider than the sheet: shrink the preview.
    useLayoutEffect(() => {
        const element = box;

        if (!element) {
            return;
        }

        const measure = () => setSpace(element.clientWidth - 32);
        measure();

        const observer = new ResizeObserver(measure);
        observer.observe(element);

        return () => observer.disconnect();
    }, [box]);

    const labelWidth = width * PX_PER_MM;
    const scale = space !== null && space < labelWidth ? space / labelWidth : 1;

    return (
        <BottomSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Étiquette"
            description="Le QR code ouvre directement la fiche de ce vin."
            footer={
                <Button
                    size="lg"
                    className="w-full"
                    onClick={() =>
                        window.open(
                            wines.label.url(wine.id, { query: { format } }),
                            '_blank',
                        )
                    }
                >
                    <Printer className="size-5" /> Imprimer {width} × {height}{' '}
                    mm
                </Button>
            }
        >
            <div className="flex justify-center gap-2">
                {(Object.keys(LABEL_FORMATS) as LabelFormat[]).map((key) => (
                    <Chip
                        key={key}
                        active={key === format}
                        className="h-9"
                        onClick={() => setFormat(key)}
                    >
                        {LABEL_FORMATS[key].name}
                        <span className="text-[11px] tabular-nums opacity-70">
                            {LABEL_FORMATS[key].width}×
                            {LABEL_FORMATS[key].height}
                        </span>
                    </Chip>
                ))}
            </div>
            <div
                ref={setBox}
                className="mt-5 grid min-h-40 place-items-center overflow-hidden rounded-3xl bg-muted p-4"
            >
                <div
                    style={{
                        width: labelWidth * scale,
                        height: height * PX_PER_MM * scale,
                    }}
                >
                    <WineLabel
                        wine={wine}
                        format={format}
                        qr={qr}
                        className="origin-top-left shadow-md"
                        style={
                            scale < 1
                                ? { transform: `scale(${scale})` }
                                : undefined
                        }
                    />
                </div>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
                {scale < 1 ? 'Aperçu réduit' : 'Aperçu à taille réelle'}
            </p>
        </BottomSheet>
    );
}
