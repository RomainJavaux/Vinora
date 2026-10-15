import type { RequestPayload } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Stepper } from '@/components/ui/stepper';
import { LocationPicker } from '@/components/wines/location-picker';
import { BottleArt, WineAvatar } from '@/components/wines/wine-visuals';
import {
    findCategory,
    formatQuantity,
    unitWord,
    useCatalog,
    wineTitle,
} from '@/lib/catalog';
import { windowRange } from '@/lib/dates';
import { cn } from '@/lib/utils';
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

export function LabelSheet({ wine, open, onOpenChange }: SheetProps) {
    const catalog = useCatalog();
    const category = findCategory(catalog, wine.category);
    const [qr, setQr] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        let active = true;
        void QRCode.toDataURL(
            window.location.origin + wines.show.url(wine.id),
            {
                margin: 0,
                width: 360,
                color: { dark: '#2a1418', light: '#ffffff' },
            },
        ).then((url) => active && setQr(url));

        return () => {
            active = false;
        };
    }, [open, wine.id]);

    return (
        <BottomSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Collerette & QR code"
            description="À accrocher au goulot ou au casier : un scan ouvre la fiche du vin."
            footer={
                <Button
                    size="lg"
                    className="w-full"
                    onClick={() => window.print()}
                >
                    <Printer />
                    Imprimer
                </Button>
            }
        >
            <div className="print-area mx-auto w-full max-w-[300px]">
                <div className="relative overflow-hidden rounded-[22px] border-2 border-dashed border-foreground/20 bg-white p-4 text-[#2a1418]">
                    <div
                        className="mx-auto mb-3 size-7 rounded-full border-2 border-[#2a1418]/25"
                        aria-hidden
                    />
                    <div className="flex items-start gap-3">
                        <BottleArt
                            category={wine.category}
                            region={wine.region}
                            className="h-20 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                            <p
                                className="text-[10px] font-bold tracking-wider uppercase"
                                style={{ color: category.color }}
                            >
                                {category.emoji} {category.label}
                            </p>
                            <p className="font-display text-lg leading-tight font-extrabold">
                                {wine.name}
                            </p>
                            {wine.producer && (
                                <p className="text-xs">{wine.producer}</p>
                            )}
                            <p className="mt-1 font-display text-2xl font-extrabold">
                                {wine.vintage ?? 'NM'}
                            </p>
                        </div>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                        <dt className="opacity-60">À boire</dt>
                        <dd className="text-right font-bold">
                            {windowRange({
                                from: wine.drinkFrom,
                                until: wine.drinkUntil,
                            })}
                        </dd>
                        <dt className="opacity-60">Appellation</dt>
                        <dd className="truncate text-right font-bold">
                            {wine.appellation ?? wine.region ?? '—'}
                        </dd>
                        <dt className="opacity-60">Emplacement</dt>
                        <dd className="truncate text-right font-bold">
                            {wine.location?.compartmentName ?? 'À ranger'}
                        </dd>
                    </dl>
                    <div className="mt-3 flex items-end justify-between gap-3">
                        <span className="flex items-center gap-1 text-[11px] font-bold">
                            <AppLogoIcon className="size-4" /> vinora
                        </span>
                        <div
                            className={cn(
                                'size-24 rounded-lg bg-white',
                                !qr && 'skeleton',
                            )}
                        >
                            {qr && (
                                <img
                                    src={qr}
                                    alt="QR code vers la fiche du vin"
                                    className="size-full"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </BottomSheet>
    );
}
