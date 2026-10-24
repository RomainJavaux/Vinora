import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    Camera,
    Check,
    ImagePlus,
    ScanText,
    Sparkles,
    Trash2,
    X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input, Textarea } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Stepper } from '@/components/ui/stepper';
import {
    LabelReadBanner,
    LabelReaderTip,
    LabelScanOverlay,
    useLabelReader,
} from '@/components/wines/label-reading';
import type { LabelFields } from '@/components/wines/label-reading';
import { GrapePicker } from '@/components/wines/grape-picker';
import { LocationPicker } from '@/components/wines/location-picker';
import { SuggestInput } from '@/components/wines/suggest-input';
import type { Suggestion } from '@/components/wines/suggest-input';
import { SplitPlaces } from '@/components/wines/split-places';
import type { Placement } from '@/components/wines/split-places';
import { BottleArt, WineHero } from '@/components/wines/wine-visuals';
import {
    findAging,
    findCategory,
    formatQuantity,
    unitWord,
    useCatalog,
} from '@/lib/catalog';
import { currentYear, todayIso, windowRange } from '@/lib/dates';
import { useIsDesktop } from '@/hooks/use-media-query';
import { compressImage } from '@/lib/image';
import { normalize } from '@/lib/search';
import { cn } from '@/lib/utils';
import cellarRoutes from '@/routes/cellars';
import wines from '@/routes/wines';
import type {
    AgingValue,
    CategoryValue,
    CellarOption,
    FormatValue,
    KnownValue,
    KnownValues,
    Wine,
    WineSuggestion,
} from '@/types/models';

type Props = {
    wine: Wine | null;
    source: Wine | null;
    defaultCompartmentId: number | null;
    cellars: CellarOption[];
    suggestions: WineSuggestion[];
    /** What the household already typed, to suggest it again. */
    known: KnownValues;
};

const winesCount = (count: number) => `${count} vin${count > 1 ? 's' : ''}`;

/**
 * Values of the household first (most used first), then the usual ones of
 * the catalog that were never used.
 */
function suggestionsFrom(
    known: KnownValue[],
    usual: { value: string; hint?: string | null }[] = [],
    withPlace = false,
): Suggestion[] {
    const seen = new Set(known.map((item) => normalize(item.value)));

    return [
        ...known.map((item) => ({
            value: item.value,
            hint: [withPlace ? item.region : null, winesCount(item.count)]
                .filter(Boolean)
                .join(' · '),
        })),
        ...usual.filter((item) => !seen.has(normalize(item.value))),
    ];
}

type FormData = {
    name: string;
    producer: string;
    category: CategoryValue;
    vintage: number | null;
    appellation: string;
    region: string;
    country: string;
    grapes: string[];
    alcohol: string;
    description: string;
    photo: File | null;
    remove_photo: boolean;
    quantity: number;
    format: FormatValue;
    price: string;
    value: string;
    purchased_on: string;
    bought_from: string;
    aging: AgingValue | null;
    drink_from: number | null;
    drink_until: number | null;
    tags: string[];
    /** Gift, souvenir, collection: never suggested. */
    keepsake: boolean;
    compartment_id: number | null;
    from: number | null;
    placements?: { compartment_id: number; quantity: number }[];
};

const euros = (cents: number | null) =>
    cents === null
        ? ''
        : (cents / 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 });

export default function WineForm({
    wine,
    source,
    defaultCompartmentId,
    cellars,
    suggestions,
    known,
}: Props) {
    const catalog = useCatalog();
    const editing = wine !== null;
    const base = wine ?? source;
    const year = currentYear();

    const form = useForm<FormData>({
        name: base?.name ?? '',
        producer: base?.producer ?? '',
        category: base?.category ?? 'red',
        vintage: base ? base.vintage : year - 2,
        appellation: base?.appellation ?? '',
        region: base?.region ?? '',
        country: base?.country ?? 'France',
        grapes: base?.grapes ?? [],
        alcohol: base?.alcohol ? String(base.alcohol).replace('.', ',') : '',
        description: base?.description ?? '',
        photo: null,
        remove_photo: false,
        quantity:
            wine?.quantity ??
            (source ? Math.max(1, source.initialQuantity) : 1),
        format: base?.format ?? 'standard',
        price: euros(base?.priceCents ?? null),
        value: euros(wine?.valueCents ?? null),
        purchased_on: wine?.purchasedOn ?? todayIso(),
        bought_from: base?.boughtFrom ?? '',
        aging: base?.aging ?? null,
        drink_from: wine?.drinkFrom ?? null,
        drink_until: wine?.drinkUntil ?? null,
        tags: base?.tags ?? [],
        keepsake: wine?.keepsake ?? false,
        compartment_id: defaultCompartmentId,
        from: source?.id ?? null,
    });

    const { data, setData, errors, processing } = form;
    const [manualWindow, setManualWindow] = useState(editing);
    const [preview, setPreview] = useState<string | null>(
        wine?.photoUrl ?? source?.photoUrl ?? null,
    );
    const [compressing, setCompressing] = useState(false);
    const [hint, setHint] = useState<string | null>(null);
    const vintageRef = useRef<HTMLDivElement>(null);
    // A single location picker is mounted, in the column that fits the screen.
    const isDesktop = useIsDesktop();
    // Bottles stored in other places when the main one is too small.
    const [placements, setPlacements] = useState<Placement[]>([]);
    const elsewhere = placements.reduce(
        (sum, placement) => sum + placement.quantity,
        0,
    );
    // « Lire l’étiquette », only for users who saved their own key.
    const canReadLabels = usePage().props.auth.user?.canReadLabels ?? false;
    const [labelRead, setLabelRead] = useState<{
        filled: string[];
        grapesInferred: boolean;
        previous: Partial<FormData>;
    } | null>(null);

    const applyLabel = (fields: LabelFields) => {
        const patch: Partial<FormData> = {};
        const filled: string[] = [];
        const set = <K extends keyof FormData>(
            key: K,
            value: FormData[K] | null,
            label: string,
        ) => {
            if (value !== null && value !== '') {
                patch[key] = value;
                filled.push(label);
            }
        };

        set('name', fields.name, 'Nom');
        set('producer', fields.producer, 'Domaine');
        set('vintage', fields.vintage, 'Millésime');
        set('category', fields.category, 'Couleur');
        set('appellation', fields.appellation, 'Appellation');
        set('region', fields.region, 'Région');
        set('country', fields.country, 'Pays');
        set(
            'grapes',
            fields.grapes.length > 0 ? fields.grapes : null,
            'Cépages',
        );
        set(
            'alcohol',
            fields.alcohol !== null
                ? String(fields.alcohol).replace('.', ',')
                : null,
            'Degré',
        );
        set('format', fields.format, 'Format');
        set('aging', fields.aging, 'Garde');

        const previous = Object.fromEntries(
            Object.keys(patch).map((key) => [key, data[key as keyof FormData]]),
        ) as Partial<FormData>;

        setData((current) => ({ ...current, ...patch }));
        setLabelRead({
            filled,
            grapesInferred: fields.grapesInferred && patch.grapes !== undefined,
            previous,
        });

        if (fields.vintage === null && fields.name !== null) {
            setHint('Millésime non lu sur l’étiquette : indique-le.');
        }
    };

    const labelReader = useLabelReader(applyLabel);

    const undoLabel = () => {
        if (labelRead) {
            setData((current) => ({ ...current, ...labelRead.previous }));
        }

        setLabelRead(null);
    };

    // Reads the new photo, or the current one (fetched back as a file).
    const readLabel = async (file?: File) => {
        let photo = file ?? data.photo;

        if (!photo && preview) {
            const blob = await fetch(preview).then((response) =>
                response.blob(),
            );
            photo = new File([blob], 'etiquette', { type: blob.type });
        }

        if (photo) {
            setLabelRead(null);
            void labelReader.read(photo);
        }
    };

    const category = findCategory(catalog, data.category);
    const aging = data.aging ?? category.aging;
    const agingOption = findAging(catalog, aging);
    const baseYear =
        data.vintage ?? Number((data.purchased_on || todayIso()).slice(0, 4));
    const autoWindow = agingOption
        ? {
              from: baseYear + agingOption.from,
              until: baseYear + agingOption.until,
          }
        : { from: null, until: null };
    const windowValue = manualWindow
        ? { from: data.drink_from, until: data.drink_until }
        : autoWindow;

    const location = cellars
        .flatMap((cellar) =>
            cellar.compartments.map((c) => ({ cellar, compartment: c })),
        )
        .find((entry) => entry.compartment.id === data.compartment_id);

    const filteredSuggestions = (() => {
        const query = normalize(data.name);

        if (!query) {
            return suggestions.slice(0, 8);
        }

        return suggestions
            .filter((item) => {
                const text = normalize(`${item.name} ${item.producer ?? ''}`);

                return text.includes(query) && normalize(item.name) !== query;
            })
            .slice(0, 8);
    })();

    const applySuggestion = (item: WineSuggestion) => {
        setData((current) => ({
            ...current,
            name: item.name,
            producer: item.producer ?? '',
            category: item.category,
            appellation: item.appellation ?? '',
            region: item.region ?? '',
            country: item.country ?? current.country,
            grapes: item.grapes,
            format: item.format,
            aging: item.aging,
            alcohol: item.alcohol
                ? String(item.alcohol).replace('.', ',')
                : current.alcohol,
            price:
                item.priceCents !== null
                    ? euros(item.priceCents)
                    : current.price,
            bought_from: item.boughtFrom ?? current.bought_from,
        }));
        setHint(
            item.vintage
                ? `Tu avais du ${item.vintage}. Quel millésime cette fois ?`
                : 'Quel millésime cette fois ?',
        );
        window.setTimeout(
            () =>
                vintageRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                }),
            150,
        );
    };

    const pickPhoto = async (file: File | undefined) => {
        if (!file) {
            return;
        }

        setCompressing(true);

        try {
            const compressed = await compressImage(file);
            setData((current) => ({
                ...current,
                photo: compressed,
                remove_photo: false,
            }));
            setPreview(URL.createObjectURL(compressed));

            // A new bottle starts with its label: read it straight away.
            if (canReadLabels && !editing) {
                void readLabel(compressed);
            }
        } finally {
            setCompressing(false);
        }
    };

    const removePhoto = () => {
        setData((current) => ({ ...current, photo: null, remove_photo: true }));
        setPreview(null);
        labelReader.clearError();
    };

    const submit = () => {
        form.transform((current) => ({
            ...current,
            drink_from: windowValue.from,
            drink_until: windowValue.until,
            aging: manualWindow ? current.aging : aging,
            ...(editing
                ? {}
                : {
                      placements: placements
                          .filter(
                              (placement) =>
                                  placement.compartmentId !==
                                  current.compartment_id,
                          )
                          .map((placement) => ({
                              compartment_id: placement.compartmentId,
                              quantity: placement.quantity,
                          })),
                  }),
            ...(editing ? { _method: 'put' } : {}),
        }));

        const options = {
            forceFormData: true,
            preserveScroll: false,
            onError: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
        };

        if (wine) {
            form.post(wines.update.url(wine.id), options);
        } else {
            form.post(wines.store.url(), options);
        }
    };

    const regionCountry = (name: string) =>
        catalog.regions.find((region) => region.name === name)?.country;

    // A known estate or appellation brings its region and country along,
    // unless they were already chosen.
    const fillPlace = (list: KnownValue[], value: string) => {
        const place = list.find((item) => item.value === value);

        if (place?.region && data.region.trim() === '') {
            setData((current) => ({
                ...current,
                region: place.region ?? current.region,
                country: place.country ?? current.country,
            }));
        }
    };
    const errorCount = Object.keys(errors).length;
    const submitLabel = editing ? 'Enregistrer' : 'Ranger en cave';

    const placeSection = (
        <FormSection title="Où la ranger ?" error={errors.compartment_id}>
            <LocationPicker
                cellars={cellars}
                value={data.compartment_id}
                onChange={(id) => setData('compartment_id', id)}
                extra={
                    editing && wine?.compartmentId === data.compartment_id
                        ? 0
                        : data.quantity - elsewhere
                }
            />
            {!editing && (
                <SplitPlaces
                    cellars={cellars}
                    mainId={data.compartment_id}
                    quantity={data.quantity}
                    placements={placements.filter(
                        (placement) =>
                            placement.compartmentId !== data.compartment_id,
                    )}
                    onChange={setPlacements}
                    error={errors.placements}
                />
            )}
        </FormSection>
    );

    return (
        <>
            <Head
                title={
                    editing ? `Modifier ${wine.name}` : 'Ranger une bouteille'
                }
            />

            <PageHeader
                back={{
                    href: wine ? wines.show(wine.id) : wines.index(),
                    label: wine ? wine.name : 'Bouteilles',
                }}
                overline={
                    editing
                        ? 'Modifier'
                        : source
                          ? 'On en rachète'
                          : 'Nouvelle bouteille'
                }
                title={editing ? wine.name : 'Quel vin range-t-on ?'}
            />

            {errorCount > 0 && (
                <div className="mb-6 rounded-2xl bg-destructive/10 p-4 text-sm font-semibold text-destructive">
                    {errorCount === 1
                        ? Object.values(errors)[0]
                        : 'Quelques champs sont à revoir, ils sont indiqués en rouge.'}
                </div>
            )}

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
                <div className="min-w-0 space-y-8">
                    {/* 1. Photo et nom */}
                    {/* Only the photo is clipped: the suggestions of the fields below
                        may hang over the edge of the card. */}
                    <section className="surface">
                        <div className="relative overflow-hidden rounded-t-[inherit]">
                            {preview ? (
                                <div className="relative aspect-[16/10] w-full overflow-hidden">
                                    <img
                                        src={preview}
                                        alt=""
                                        className="absolute inset-0 size-full object-cover"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent p-3 pt-10">
                                        {canReadLabels && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="mr-auto"
                                                onClick={() => void readLabel()}
                                                disabled={labelReader.reading}
                                            >
                                                <ScanText />
                                                Lire l’étiquette
                                            </Button>
                                        )}
                                        <PhotoButton
                                            onPick={pickPhoto}
                                            variant="glass"
                                        >
                                            <ImagePlus /> Changer
                                        </PhotoButton>
                                        <Button
                                            type="button"
                                            size="icon-sm"
                                            variant="destructive"
                                            onClick={removePhoto}
                                            aria-label="Retirer la photo"
                                        >
                                            <Trash2 />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <WineHero
                                    category={data.category}
                                    region={data.region}
                                    vintage={data.vintage}
                                    className="rounded-none"
                                    bounceKey={`${data.category}-${data.region}`}
                                >
                                    <div className="absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-2 p-3">
                                        <PhotoButton onPick={pickPhoto} capture>
                                            <Camera /> Photo de l’étiquette
                                        </PhotoButton>
                                        <PhotoButton
                                            onPick={pickPhoto}
                                            variant="glass"
                                        >
                                            <ImagePlus /> Galerie
                                        </PhotoButton>
                                    </div>
                                </WineHero>
                            )}
                            {compressing && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                                    <Spinner className="size-8" />
                                </div>
                            )}
                            <LabelScanOverlay active={labelReader.reading} />
                        </div>
                        <InputError
                            message={
                                errors.photo ?? labelReader.error ?? undefined
                            }
                            className="px-5 pt-3"
                        />

                        <div className="space-y-3 p-5">
                            <AnimatePresence>
                                {labelRead && (
                                    <LabelReadBanner
                                        filled={labelRead.filled}
                                        grapesInferred={
                                            labelRead.grapesInferred
                                        }
                                        onUndo={undoLabel}
                                    />
                                )}
                            </AnimatePresence>
                            {!canReadLabels && !editing && <LabelReaderTip />}
                            <Input
                                value={data.name}
                                onChange={(event) =>
                                    setData('name', event.target.value)
                                }
                                placeholder="Château Talbot, Morgon Côte du Py…"
                                className="h-14 font-display text-xl font-bold"
                                autoFocus={!editing && !source}
                                maxLength={120}
                                aria-label="Nom du vin"
                            />
                            <InputError message={errors.name} />
                            <SuggestInput
                                value={data.producer}
                                onChange={(value) => setData('producer', value)}
                                suggestions={suggestionsFrom(
                                    known.producers,
                                    [],
                                    true,
                                )}
                                onPick={(suggestion) =>
                                    fillPlace(known.producers, suggestion.value)
                                }
                                title="Tes domaines"
                                placeholder="Domaine, château ou maison (facultatif)"
                                maxLength={120}
                                aria-label="Domaine"
                            />

                            {!editing && filteredSuggestions.length > 0 && (
                                <div className="pt-1">
                                    <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
                                        <Sparkles className="size-3.5 text-warm" />
                                        Déjà dans ta cave
                                    </p>
                                    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:flex-wrap">
                                        {filteredSuggestions.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() =>
                                                    applySuggestion(item)
                                                }
                                                className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-card pr-3.5 pl-1.5 text-left text-sm transition-colors hover:bg-accent/60 active:scale-[0.97]"
                                            >
                                                <span className="flex h-8 w-6 items-end justify-center">
                                                    <BottleArt
                                                        category={item.category}
                                                        region={item.region}
                                                        className="h-8"
                                                    />
                                                </span>
                                                <span className="max-w-[200px] truncate font-semibold">
                                                    {item.name}
                                                </span>
                                                {item.vintage && (
                                                    <span className="text-muted-foreground">
                                                        {item.vintage}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 2. Couleur */}
                    <FormSection
                        title="Quelle couleur ?"
                        error={errors.category}
                    >
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                            {catalog.categories.map((option) => {
                                const active = option.value === data.category;

                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() =>
                                            setData('category', option.value)
                                        }
                                        className={cn(
                                            'flex flex-col items-center gap-1 rounded-2xl border px-1 py-3 text-[12px] font-semibold transition-[transform,background-color] active:scale-95',
                                            active
                                                ? 'border-transparent text-white shadow-soft'
                                                : 'border-border bg-card hover:bg-accent/60',
                                        )}
                                        style={
                                            active
                                                ? { background: option.color }
                                                : undefined
                                        }
                                    >
                                        <motion.span
                                            className="text-2xl"
                                            animate={
                                                active
                                                    ? {
                                                          rotate: [
                                                              0, -14, 12, -6, 0,
                                                          ],
                                                          scale: [1, 1.15, 1],
                                                      }
                                                    : { rotate: 0, scale: 1 }
                                            }
                                            transition={{ duration: 0.5 }}
                                        >
                                            {option.emoji}
                                        </motion.span>
                                        <span className="leading-tight">
                                            {option.short}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </FormSection>

                    {/* 3. Millésime */}
                    <div ref={vintageRef}>
                        <FormSection
                            title="Le millésime"
                            error={errors.vintage}
                        >
                            <AnimatePresence>
                                {hint && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="mb-3 flex items-center gap-2 rounded-2xl bg-warm/20 px-3 py-2 text-sm font-semibold"
                                    >
                                        ✨ {hint}
                                        <button
                                            type="button"
                                            onClick={() => setHint(null)}
                                            className="ml-auto"
                                            aria-label="Fermer"
                                        >
                                            <X className="size-4" />
                                        </button>
                                    </motion.p>
                                )}
                            </AnimatePresence>
                            <div className="surface space-y-4 p-4">
                                {data.vintage !== null ? (
                                    <Stepper
                                        value={data.vintage}
                                        onChange={(value) =>
                                            setData('vintage', value)
                                        }
                                        min={1800}
                                        max={year + 1}
                                        size="lg"
                                        format={(value) => String(value)}
                                        label="Millésime"
                                    />
                                ) : (
                                    <p className="py-3 text-center font-display text-3xl font-extrabold">
                                        Non millésimé
                                    </p>
                                )}
                                <div className="flex flex-wrap justify-center gap-2">
                                    {Array.from(
                                        { length: 6 },
                                        (_, i) => year - 1 - i,
                                    ).map((value) => (
                                        <Chip
                                            key={value}
                                            size="sm"
                                            active={data.vintage === value}
                                            onClick={() =>
                                                setData('vintage', value)
                                            }
                                        >
                                            {value}
                                        </Chip>
                                    ))}
                                    <Chip
                                        size="sm"
                                        active={data.vintage === null}
                                        color="var(--foreground)"
                                        className={
                                            data.vintage === null
                                                ? 'text-background'
                                                : undefined
                                        }
                                        onClick={() =>
                                            setData(
                                                'vintage',
                                                data.vintage === null
                                                    ? year - 2
                                                    : null,
                                            )
                                        }
                                    >
                                        Non millésimé
                                    </Chip>
                                </div>
                            </div>
                        </FormSection>
                    </div>

                    {/* 4. Origine */}
                    <FormSection title="D’où vient-il ?" optional>
                        <div className="space-y-3">
                            <SuggestInput
                                value={data.appellation}
                                onChange={(value) =>
                                    setData('appellation', value)
                                }
                                suggestions={suggestionsFrom(
                                    known.appellations,
                                    [],
                                    true,
                                )}
                                onPick={(suggestion) =>
                                    fillPlace(
                                        known.appellations,
                                        suggestion.value,
                                    )
                                }
                                title="Tes appellations"
                                placeholder="Appellation : Pauillac, Chablis 1er Cru…"
                                maxLength={120}
                                aria-label="Appellation"
                            />
                            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
                                {catalog.regions.map((region) => (
                                    <Chip
                                        key={region.name}
                                        size="sm"
                                        active={data.region === region.name}
                                        onClick={() =>
                                            setData((current) => ({
                                                ...current,
                                                region:
                                                    current.region ===
                                                    region.name
                                                        ? ''
                                                        : region.name,
                                                country:
                                                    current.region ===
                                                    region.name
                                                        ? current.country
                                                        : (regionCountry(
                                                              region.name,
                                                          ) ?? current.country),
                                            }))
                                        }
                                    >
                                        {region.name}
                                    </Chip>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <SuggestInput
                                    value={data.region}
                                    onChange={(value) =>
                                        setData('region', value)
                                    }
                                    suggestions={suggestionsFrom(
                                        known.regions.map((region) => ({
                                            ...region,
                                            region: region.country,
                                        })),
                                        catalog.regions.map((region) => ({
                                            value: region.name,
                                            hint: region.country,
                                        })),
                                        true,
                                    )}
                                    onPick={(suggestion) =>
                                        setData((current) => ({
                                            ...current,
                                            country:
                                                known.regions.find(
                                                    (region) =>
                                                        region.value ===
                                                        suggestion.value,
                                                )?.country ??
                                                regionCountry(
                                                    suggestion.value,
                                                ) ??
                                                current.country,
                                        }))
                                    }
                                    title="Tes régions"
                                    placeholder="Région"
                                    maxLength={60}
                                    aria-label="Région"
                                />
                                <SuggestInput
                                    value={data.country}
                                    onChange={(value) =>
                                        setData('country', value)
                                    }
                                    suggestions={suggestionsFrom(
                                        known.countries,
                                        catalog.countries.map((country) => ({
                                            value: country,
                                        })),
                                    )}
                                    title="Tes pays"
                                    placeholder="Pays"
                                    maxLength={60}
                                    aria-label="Pays"
                                />
                            </div>
                            <GrapePicker
                                value={data.grapes}
                                onChange={(grapes) => setData('grapes', grapes)}
                                category={data.category}
                                region={data.region}
                                country={data.country}
                                known={known.grapes}
                            />
                            <InputError message={errors.grapes} />
                        </div>
                    </FormSection>

                    {/* 5. Combien */}
                    <FormSection
                        title="Combien ?"
                        error={errors.quantity ?? errors.format}
                    >
                        <div className="surface space-y-5 p-4">
                            <Stepper
                                value={data.quantity}
                                onChange={(value) => setData('quantity', value)}
                                min={1}
                                max={999}
                                size="lg"
                                unit={unitWord(
                                    catalog,
                                    data.quantity,
                                    data.format,
                                )}
                                label="Nombre de bouteilles"
                            />
                            <div className="flex flex-wrap justify-center gap-2">
                                {[1, 2, 3, 6, 12, 24].map((value) => (
                                    <Chip
                                        key={value}
                                        size="sm"
                                        active={data.quantity === value}
                                        onClick={() =>
                                            setData('quantity', value)
                                        }
                                    >
                                        {value === 6
                                            ? '6 · carton'
                                            : value === 12
                                              ? '12 · caisse'
                                              : value}
                                    </Chip>
                                ))}
                            </div>
                            <div className="border-t border-hairline pt-4">
                                <p className="mb-2 text-sm font-semibold">
                                    Format
                                </p>
                                <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
                                    {catalog.formats.map((format) => (
                                        <Chip
                                            key={format.value}
                                            active={
                                                data.format === format.value
                                            }
                                            onClick={() =>
                                                setData('format', format.value)
                                            }
                                        >
                                            {format.label}
                                            <span className="text-[12px] opacity-70">
                                                {format.volume}
                                            </span>
                                        </Chip>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </FormSection>

                    {/* 6. Emplacement (mobile) */}
                    {!isDesktop && placeSection}

                    {/* 7. Fenêtre de dégustation */}
                    <FormSection
                        title="Quand la boire ?"
                        error={errors.drink_until ?? errors.drink_from}
                    >
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {catalog.agings.map((option) => {
                                    const active =
                                        !data.keepsake &&
                                        aging === option.value;

                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            aria-pressed={active}
                                            onClick={() => {
                                                setData((current) => ({
                                                    ...current,
                                                    aging: option.value,
                                                    keepsake: false,
                                                }));
                                                setManualWindow(false);
                                            }}
                                            className={cn(
                                                'rounded-2xl border p-3 text-left transition-[transform,background-color] active:scale-[0.97]',
                                                active
                                                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                                                    : 'border-border bg-card hover:bg-accent/60',
                                            )}
                                        >
                                            <span className="text-xl">
                                                {option.emoji}
                                            </span>
                                            <span className="mt-1 block text-sm font-bold">
                                                {option.label}
                                            </span>
                                            <span className="block text-[12px] text-muted-foreground">
                                                {option.description}
                                            </span>
                                        </button>
                                    );
                                })}
                                <button
                                    type="button"
                                    aria-pressed={data.keepsake}
                                    onClick={() =>
                                        setData('keepsake', !data.keepsake)
                                    }
                                    className={cn(
                                        'col-span-2 flex items-center gap-3 rounded-2xl border p-3 text-left transition-[transform,background-color] active:scale-[0.98] sm:col-span-4',
                                        data.keepsake
                                            ? 'border-keep bg-keep/12 ring-1 ring-keep'
                                            : 'border-dashed border-border bg-card hover:bg-accent/60',
                                    )}
                                >
                                    <span className="text-2xl" aria-hidden>
                                        🎁
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-bold">
                                            Ne pas boire
                                        </span>
                                        <span className="block text-[12px] text-muted-foreground">
                                            Cadeau, souvenir ou bouteille de
                                            collection : Vinora ne la proposera
                                            jamais.
                                        </span>
                                    </span>
                                    <span
                                        className={cn(
                                            'flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                                            data.keepsake
                                                ? 'border-keep bg-keep text-white'
                                                : 'border-border',
                                        )}
                                        aria-hidden
                                    >
                                        {data.keepsake && (
                                            <Check className="size-3.5" />
                                        )}
                                    </span>
                                </button>
                            </div>

                            <AnimatePresence initial={false}>
                                {data.keepsake && (
                                    <motion.p
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden rounded-2xl bg-keep/10 px-4 py-3 text-[14px]"
                                    >
                                        Elle reste dans ta cave et dans ton
                                        stock, mais n’apparaîtra ni dans « À
                                        boire vite », ni dans « Quelle bouteille
                                        ce soir ? ». Tu peux toujours l’ouvrir
                                        si l’occasion se présente.
                                    </motion.p>
                                )}
                            </AnimatePresence>

                            <div
                                className={cn(
                                    'surface p-4 transition-opacity',
                                    data.keepsake && 'opacity-50',
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[13px] font-semibold text-muted-foreground">
                                            À boire
                                        </p>
                                        <p className="font-display text-3xl font-extrabold tabular-nums">
                                            {windowRange(windowValue)}
                                        </p>
                                    </div>
                                    {!manualWindow && agingOption && (
                                        <span className="shrink-0 rounded-full bg-warm/25 px-2.5 py-1 text-[12px] font-bold">
                                            ✨ Auto ·{' '}
                                            {agingOption.label.toLowerCase()}
                                        </span>
                                    )}
                                </div>

                                {manualWindow ? (
                                    <div className="mt-4 grid grid-cols-1 gap-4 border-t border-hairline pt-4 sm:grid-cols-2">
                                        <div>
                                            <p className="mb-2 text-center text-sm font-semibold">
                                                Dès
                                            </p>
                                            <Stepper
                                                value={
                                                    data.drink_from ??
                                                    autoWindow.from ??
                                                    year
                                                }
                                                onChange={(value) =>
                                                    setData((current) => ({
                                                        ...current,
                                                        drink_from: value,
                                                        drink_until: Math.max(
                                                            value,
                                                            current.drink_until ??
                                                                value,
                                                        ),
                                                    }))
                                                }
                                                min={1800}
                                                max={2300}
                                                format={String}
                                                label="Début de la fenêtre"
                                            />
                                        </div>
                                        <div>
                                            <p className="mb-2 text-center text-sm font-semibold">
                                                Jusqu’en
                                            </p>
                                            <Stepper
                                                value={
                                                    data.drink_until ??
                                                    autoWindow.until ??
                                                    year + 5
                                                }
                                                onChange={(value) =>
                                                    setData((current) => ({
                                                        ...current,
                                                        drink_until: value,
                                                        drink_from: Math.min(
                                                            value,
                                                            current.drink_from ??
                                                                value,
                                                        ),
                                                    }))
                                                }
                                                min={1800}
                                                max={2300}
                                                format={String}
                                                label="Fin de la fenêtre"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="sm:col-span-2"
                                            onClick={() =>
                                                setManualWindow(false)
                                            }
                                        >
                                            <Sparkles /> Revenir au calcul auto
                                        </Button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setData((current) => ({
                                                ...current,
                                                drink_from:
                                                    autoWindow.from ?? year,
                                                drink_until:
                                                    autoWindow.until ??
                                                    year + 5,
                                            }));
                                            setManualWindow(true);
                                        }}
                                        className="mt-2 text-sm font-semibold text-primary hover:underline"
                                    >
                                        Choisir d’autres années
                                    </button>
                                )}
                            </div>
                            {agingOption && !data.keepsake && (
                                <p className="text-[13px] text-muted-foreground">
                                    Conseil pour un{' '}
                                    {category.label.toLowerCase()} en{' '}
                                    {agingOption.label.toLowerCase()} :{' '}
                                    {agingOption.description.toLowerCase()}{' '}
                                    {data.vintage
                                        ? 'après le millésime'
                                        : 'après l’achat'}
                                    . La fiche technique du domaine est souvent
                                    plus précise !
                                </p>
                            )}
                        </div>
                    </FormSection>

                    {/* 8. Achat */}
                    <FormSection title="L’achat" optional>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <MoneyInput
                                    label="Prix par bouteille"
                                    value={data.price}
                                    onChange={(value) =>
                                        setData('price', value)
                                    }
                                    error={errors.price}
                                />
                                <MoneyInput
                                    label="Valeur estimée"
                                    value={data.value}
                                    onChange={(value) =>
                                        setData('value', value)
                                    }
                                    error={errors.value}
                                />
                            </div>
                            <label className="block space-y-1.5">
                                <span className="text-sm font-semibold">
                                    Acheté le
                                </span>
                                <Input
                                    type="date"
                                    value={data.purchased_on}
                                    max={todayIso()}
                                    onChange={(event) =>
                                        setData(
                                            'purchased_on',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError message={errors.purchased_on} />
                            </label>
                            <SuggestInput
                                value={data.bought_from}
                                onChange={(value) =>
                                    setData('bought_from', value)
                                }
                                suggestions={suggestionsFrom(
                                    known.boughtFrom,
                                    catalog.boughtFrom.map((place) => ({
                                        value: place,
                                    })),
                                )}
                                title="Tes lieux d’achat"
                                placeholder="Chez qui ? Caviste, domaine…"
                                maxLength={80}
                                aria-label="Lieu d’achat"
                            />
                            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
                                {catalog.boughtFrom.map((place) => (
                                    <Chip
                                        key={place}
                                        size="sm"
                                        active={data.bought_from === place}
                                        onClick={() =>
                                            setData('bought_from', place)
                                        }
                                    >
                                        {place}
                                    </Chip>
                                ))}
                            </div>
                        </div>
                    </FormSection>

                    {/* 9. Détails */}
                    <FormSection title="Détails" optional>
                        <div className="space-y-3">
                            <Textarea
                                value={data.description}
                                onChange={(event) =>
                                    setData('description', event.target.value)
                                }
                                placeholder="Conseil du vigneron, occasion prévue, à carafer…"
                                maxLength={2000}
                                aria-label="Notes"
                            />
                            <label className="block w-40 space-y-1.5">
                                <span className="text-sm font-semibold">
                                    Degré
                                </span>
                                <div className="relative">
                                    <Input
                                        inputMode="decimal"
                                        value={data.alcohol}
                                        onChange={(event) =>
                                            setData(
                                                'alcohol',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="13,5"
                                        className="pr-10"
                                    />
                                    <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground">
                                        %
                                    </span>
                                </div>
                                <InputError message={errors.alcohol} />
                            </label>
                            <TagInput
                                value={data.tags}
                                onChange={(tags) => setData('tags', tags)}
                                known={known.tags}
                            />
                            <InputError message={errors.tags} />
                        </div>
                    </FormSection>
                </div>

                {/* Colonne droite (desktop) */}
                <aside className={isDesktop ? undefined : 'hidden'}>
                    <div className="sticky top-10 space-y-4">
                        {isDesktop && placeSection}
                        <Button
                            variant="warm"
                            size="lg"
                            className="w-full"
                            onClick={submit}
                            disabled={processing}
                        >
                            {processing ? <Spinner /> : <Check />}
                            {submitLabel}
                        </Button>
                        <Button asChild variant="ghost" className="w-full">
                            <Link
                                href={
                                    wine ? wines.show(wine.id) : wines.index()
                                }
                            >
                                Annuler
                            </Link>
                        </Button>
                    </div>
                </aside>
            </div>

            {/* Barre d’action mobile */}
            <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-background/85 px-4 pt-3 backdrop-blur-xl lg:hidden">
                <div className="flex items-center gap-3">
                    <p className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                        {category.emoji}{' '}
                        {formatQuantity(catalog, data.quantity, data.format)}
                        <span className="text-muted-foreground">
                            {' → '}
                            {location
                                ? location.compartment.name
                                : 'choisis une clayette'}
                            {location && placements.length > 0
                                ? ` + ${placements.length} autre${placements.length > 1 ? 's' : ''}`
                                : ''}
                        </span>
                    </p>
                    <Button
                        variant="warm"
                        size="lg"
                        className="shrink-0"
                        onClick={submit}
                        disabled={processing}
                    >
                        {processing ? <Spinner /> : '🍷'}
                        {editing ? 'Enregistrer' : 'Ranger'}
                    </Button>
                </div>
            </div>

            {cellars.length === 0 && (
                <p className="mt-6 text-center text-sm text-muted-foreground">
                    Pas encore de cave ?{' '}
                    <Link
                        href={cellarRoutes.create()}
                        className="font-semibold text-primary"
                    >
                        Crée-la d’abord
                    </Link>
                    .
                </p>
            )}
        </>
    );
}

function FormSection({
    title,
    optional = false,
    error,
    children,
}: {
    title: string;
    optional?: boolean;
    error?: string;
    children: ReactNode;
}) {
    return (
        <section>
            <h2 className="mb-3 font-display text-lg font-bold">
                {title}
                {optional && (
                    <span className="ml-2 text-sm font-medium text-muted-foreground">
                        facultatif
                    </span>
                )}
            </h2>
            {children}
            <InputError message={error} className="mt-2" />
        </section>
    );
}

function PhotoButton({
    onPick,
    capture = false,
    variant = 'solid',
    children,
}: {
    onPick: (file: File | undefined) => void;
    capture?: boolean;
    variant?: 'solid' | 'glass';
    children: ReactNode;
}) {
    const input = useRef<HTMLInputElement>(null);

    return (
        <>
            <Button
                type="button"
                size="sm"
                variant={variant === 'solid' ? 'default' : 'secondary'}
                className={
                    variant === 'glass'
                        ? 'bg-white/85 text-[#2a1418] backdrop-blur hover:bg-white'
                        : undefined
                }
                onClick={() => input.current?.click()}
            >
                {children}
            </Button>
            <input
                ref={input}
                type="file"
                accept="image/*"
                {...(capture ? { capture: 'environment' as const } : {})}
                className="hidden"
                onChange={(event) => {
                    onPick(event.target.files?.[0]);
                    event.target.value = '';
                }}
            />
        </>
    );
}

function MoneyInput({
    label,
    value,
    onChange,
    error,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
}) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-semibold">{label}</span>
            <div className="relative">
                <Input
                    inputMode="decimal"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder="0"
                    className="pr-9"
                />
                <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground">
                    €
                </span>
            </div>
            <InputError message={error} />
        </label>
    );
}

function TagInput({
    value,
    onChange,
    known,
}: {
    value: string[];
    onChange: (value: string[]) => void;
    known: KnownValue[];
}) {
    const [draft, setDraft] = useState('');

    const add = (typed = draft) => {
        const tag = typed.trim().replace(/^#/, '').toLowerCase();

        if (tag && !value.includes(tag) && value.length < 8) {
            onChange([...value, tag]);
        }

        setDraft('');
    };

    return (
        <div>
            <p className="mb-2 text-sm font-semibold">Étiquettes</p>
            {value.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                    {value.map((tag) => (
                        <button
                            key={tag}
                            type="button"
                            onClick={() =>
                                onChange(value.filter((item) => item !== tag))
                            }
                            className="flex h-8 items-center gap-1 rounded-full bg-primary/10 px-3 text-[13px] font-semibold text-primary"
                        >
                            #{tag}
                            <X className="size-3" />
                        </button>
                    ))}
                </div>
            )}
            <SuggestInput
                value={draft}
                onChange={setDraft}
                suggestions={suggestionsFrom(
                    known.filter((tag) => !value.includes(tag.value)),
                )}
                onPick={(suggestion) => add(suggestion.value)}
                title="Tes étiquettes"
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ',') {
                        event.preventDefault();
                        add();
                    }
                }}
                onBlur={() => add()}
                placeholder="garde, cadeau, fête… (Entrée pour ajouter)"
                maxLength={30}
                disabled={value.length >= 8}
            />
        </div>
    );
}
