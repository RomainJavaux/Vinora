import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRightLeft,
    Ellipsis,
    Gift,
    PackagePlus,
    Pencil,
    QrCode,
    RotateCcw,
    Trash2,
    Wine as WineIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { MovementEntry } from '@/components/activity/movement-entry';
import { CellarVisual } from '@/components/cellar/cellar-visual';
import { MemberAvatar } from '@/components/member-avatar';
import { PageHeader } from '@/components/page-header';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StarRating } from '@/components/ui/pickers';
import { DrinkSheet } from '@/components/wines/drink-sheet';
import {
    DeleteSheet,
    DiscardSheet,
    GiftSheet,
    LabelSheet,
    MoveSheet,
    RestockSheet,
} from '@/components/wines/wine-sheets';
import {
    LocationPill,
    QuantityBar,
    RatingBadge,
    WindowBadge,
    WindowRing,
    WineAvatar,
    WineHero,
} from '@/components/wines/wine-visuals';
import {
    findAging,
    findCategory,
    findFormat,
    formatPrice,
    statusColor,
    unitWord,
    useCatalog,
    wineTitle,
} from '@/lib/catalog';
import {
    currentYear,
    formatDate,
    timeAgo,
    windowLabel,
    windowRingText,
} from '@/lib/dates';
import { cn } from '@/lib/utils';
import cellarRoutes from '@/routes/cellars';
import wines from '@/routes/wines';
import type { CellarOption, Movement, Wine } from '@/types/models';

type Props = {
    wine: Wine;
    movements: Movement[];
    siblings: Wine[];
    tastings: Movement[];
    cellars: CellarOption[];
};

type Sheet =
    | 'gift'
    | 'restock'
    | 'move'
    | 'discard'
    | 'label'
    | 'delete'
    | null;

const RING_EMOJI = {
    young: '🌱',
    ready: '🍷',
    soon: '⏳',
    past: '⚠️',
    unknown: '❔',
} as const;

export default function WineShow({
    wine,
    movements,
    siblings,
    tastings,
    cellars,
}: Props) {
    const catalog = useCatalog();
    const { household } = usePage().props;
    const category = findCategory(catalog, wine.category);
    const format = findFormat(catalog, wine.format);
    const [drinking, setDrinking] = useState<Wine | null>(null);
    const [sheet, setSheet] = useState<Sheet>(null);
    const finished = wine.quantity === 0;
    const open = (name: Sheet) => () => setSheet(name);
    const close = (value: boolean) => !value && setSheet(null);
    const cellar = cellars.find((item) => item.id === wine.location?.cellarId);
    const average = tastings
        .filter((t) => t.rating)
        .reduce((sum, t, _, list) => sum + (t.rating ?? 0) / list.length, 0);

    const actions = (
        <div className="space-y-2">
            {!finished ? (
                <>
                    <Button
                        size="lg"
                        className="w-full"
                        onClick={() => setDrinking(wine)}
                    >
                        <WineIcon />
                        Boire
                    </Button>
                    <div className="grid grid-cols-3 gap-2">
                        <Button
                            variant="outline"
                            className="h-auto flex-col gap-1 py-2.5 text-[13px]"
                            onClick={open('gift')}
                        >
                            <Gift />
                            <span className="truncate">Offrir</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-auto flex-col gap-1 py-2.5 text-[13px]"
                            onClick={open('restock')}
                        >
                            <PackagePlus />
                            <span className="truncate">Rajouter</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-auto flex-col gap-1 py-2.5 text-[13px]"
                            onClick={open('move')}
                        >
                            <ArrowRightLeft />
                            <span className="truncate">Déplacer</span>
                        </Button>
                    </div>
                </>
            ) : (
                <div className="bg-brand relative overflow-hidden rounded-3xl p-5 text-white">
                    <div className="hero-veil absolute inset-0" />
                    <div className="relative">
                        <p className="font-display text-lg font-extrabold">
                            🥂 Cette bouteille est terminée
                        </p>
                        <p className="mt-1 text-sm text-white/85">
                            Elle était bonne ? Rachète-la en un geste.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                                asChild
                                variant="secondary"
                                className="bg-white text-[#9f1239] hover:bg-white/90"
                            >
                                <Link
                                    href={wines.create({
                                        query: { from: wine.id },
                                    })}
                                >
                                    <RotateCcw />
                                    Racheter
                                </Link>
                            </Button>
                            <Button
                                variant="ghost"
                                className="text-white hover:bg-white/15"
                                onClick={open('restock')}
                            >
                                Remettre en stock
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <>
            <Head title={wineTitle(wine)} />

            <PageHeader
                back={{ href: wines.index(), label: 'Bouteilles' }}
                overline={`${category.emoji} ${category.label}${wine.region ? ` · ${wine.region}` : ''}`}
                title={
                    <>
                        {wine.name}
                        {wine.vintage && (
                            <span className="text-primary">
                                {' '}
                                {wine.vintage}
                            </span>
                        )}
                    </>
                }
                description={wine.producer ?? undefined}
                actions={
                    <>
                        <Button
                            asChild
                            variant="outline"
                            size="icon"
                            aria-label="Modifier"
                        >
                            <Link href={wines.edit(wine.id)}>
                                <Pencil />
                            </Link>
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    aria-label="Plus d’actions"
                                >
                                    <Ellipsis />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={open('label')}>
                                    <QrCode />
                                    Collerette & QR code
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={wines.create({
                                            query: { from: wine.id },
                                        })}
                                    >
                                        <RotateCcw />
                                        Racheter
                                    </Link>
                                </DropdownMenuItem>
                                {!finished && (
                                    <>
                                        <DropdownMenuItem
                                            onSelect={open('gift')}
                                        >
                                            <Gift />
                                            Offrir
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onSelect={open('discard')}
                                        >
                                            <Trash2 />
                                            Jeter (bouchonné, cassé…)
                                        </DropdownMenuItem>
                                    </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={open('delete')}
                                >
                                    <Trash2 />
                                    Supprimer définitivement
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                }
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
                <div className="min-w-0 space-y-6">
                    <WineHero
                        category={wine.category}
                        region={wine.region}
                        vintage={wine.vintage}
                        photoUrl={wine.photoUrl}
                    >
                        <div className="absolute bottom-3 left-3">
                            <WindowBadge
                                window={wine.window}
                                className="bg-card/90! backdrop-blur"
                            />
                        </div>
                        {wine.tags.length > 0 && (
                            <div className="absolute right-3 bottom-3 flex max-w-[60%] flex-wrap justify-end gap-1">
                                {wine.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="glass rounded-full px-2.5 py-1 text-[12px] font-semibold"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </WineHero>

                    <div className="lg:hidden">{actions}</div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Card title="Il reste">
                            <p className="flex items-baseline gap-2">
                                <AnimatedNumber
                                    value={wine.quantity}
                                    className="font-display text-5xl font-extrabold"
                                />
                                <span className="font-semibold text-muted-foreground">
                                    {unitWord(
                                        catalog,
                                        wine.quantity,
                                        wine.format,
                                    )}{' '}
                                    / {wine.initialQuantity}
                                </span>
                            </p>
                            <QuantityBar
                                quantity={wine.quantity}
                                initial={wine.initialQuantity}
                                className="mt-3"
                            />
                            {wine.rating && (
                                <p className="mt-3 flex items-center gap-2 text-sm">
                                    <StarRating value={wine.rating} size="sm" />
                                    <span className="font-semibold">
                                        {wine.rating.toLocaleString('fr-FR')} /
                                        5
                                    </span>
                                </p>
                            )}
                        </Card>

                        <Card title="Apogée">
                            <div className="flex items-center gap-4">
                                <WindowRing window={wine.window} size={78}>
                                    <span className="text-xl">
                                        {RING_EMOJI[wine.window.status]}
                                    </span>
                                    <span className="mt-0.5 text-[10px] font-bold">
                                        {windowRingText(wine.window).value}
                                    </span>
                                </WindowRing>
                                <div className="min-w-0">
                                    <p
                                        className="font-display text-lg leading-tight font-extrabold"
                                        style={{
                                            color: statusColor[
                                                wine.window.status
                                            ],
                                        }}
                                    >
                                        {windowLabel(wine.window)}
                                    </p>
                                    {wine.aging && (
                                        <p className="text-[13px] text-muted-foreground">
                                            {
                                                findAging(catalog, wine.aging)
                                                    ?.label
                                            }
                                        </p>
                                    )}
                                </div>
                            </div>
                            <Timeline wine={wine} />
                        </Card>
                    </div>

                    {(category.serving || category.servingTip) && (
                        <Card title="Pour la servir">
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                                {category.serving && (
                                    <p className="font-display text-2xl font-extrabold">
                                        🌡️ {category.serving[0]}–
                                        {category.serving[1]} °C
                                    </p>
                                )}
                                <Pairings category={wine.category} />
                            </div>
                            {category.servingTip && (
                                <p className="mt-3 text-sm text-muted-foreground">
                                    {category.servingTip}
                                </p>
                            )}
                        </Card>
                    )}

                    <Card title="Détails">
                        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                            <Detail label="Domaine" value={wine.producer} />
                            <Detail
                                label="Appellation"
                                value={wine.appellation}
                            />
                            <Detail
                                label="Origine"
                                value={
                                    [wine.region, wine.country]
                                        .filter(Boolean)
                                        .join(' · ') || null
                                }
                            />
                            <Detail
                                label="Cépages"
                                value={wine.grapes.join(', ') || null}
                            />
                            <Detail
                                label="Format"
                                value={`${format.label} · ${format.volume}`}
                            />
                            <Detail
                                label="Degré"
                                value={
                                    wine.alcohol
                                        ? `${wine.alcohol.toLocaleString('fr-FR')} %`
                                        : null
                                }
                            />
                            {household?.canSeePrices && (
                                <>
                                    <Detail
                                        label="Prix d’achat"
                                        value={
                                            wine.priceCents !== null
                                                ? `${formatPrice(wine.priceCents)} la bouteille`
                                                : null
                                        }
                                    />
                                    <Detail
                                        label="Valeur estimée"
                                        value={
                                            wine.valueCents !== null
                                                ? formatPrice(wine.valueCents)
                                                : null
                                        }
                                    />
                                </>
                            )}
                            <Detail
                                label="Acheté le"
                                value={
                                    wine.purchasedOn
                                        ? formatDate(wine.purchasedOn)
                                        : null
                                }
                            />
                            <Detail label="Chez" value={wine.boughtFrom} />
                            {wine.createdBy && (
                                <div>
                                    <dt className="text-muted-foreground">
                                        Rangé par
                                    </dt>
                                    <dd className="mt-0.5 flex items-center gap-2 font-semibold">
                                        <MemberAvatar
                                            id={wine.createdBy.id}
                                            name={wine.createdBy.name}
                                            size={22}
                                        />
                                        {wine.createdBy.name} ·{' '}
                                        {timeAgo(wine.createdAt)}
                                    </dd>
                                </div>
                            )}
                        </dl>
                        {wine.description && (
                            <p className="mt-4 rounded-2xl bg-muted/60 p-4 text-[15px] whitespace-pre-line">
                                {wine.description}
                            </p>
                        )}
                    </Card>

                    <Card
                        title={`Dégustations${tastings.length ? ` · ${tastings.length}` : ''}`}
                        action={
                            average > 0 && (
                                <RatingBadge
                                    rating={Math.round(average * 10) / 10}
                                />
                            )
                        }
                    >
                        {tastings.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Personne ne l’a encore notée. À la prochaine
                                bouteille, laisse une note : on s’en souviendra
                                pour toi.
                            </p>
                        ) : (
                            <ul className="space-y-4">
                                {tastings.map((tasting) => (
                                    <li key={tasting.id} className="flex gap-3">
                                        <MemberAvatar
                                            id={tasting.user?.id ?? 0}
                                            name={tasting.user?.name ?? '?'}
                                            size={32}
                                        />
                                        <div className="min-w-0">
                                            <p className="flex flex-wrap items-center gap-2 text-sm">
                                                <strong>
                                                    {tasting.user?.name ??
                                                        'Quelqu’un'}
                                                </strong>
                                                {tasting.rating && (
                                                    <StarRating
                                                        value={tasting.rating}
                                                        size="sm"
                                                    />
                                                )}
                                                <span className="text-muted-foreground">
                                                    {tasting.wineVintage &&
                                                    tasting.wineVintage !==
                                                        wine.vintage
                                                        ? `${tasting.wineVintage} · `
                                                        : ''}
                                                    {timeAgo(tasting.createdAt)}
                                                </span>
                                            </p>
                                            {tasting.note && (
                                                <p className="mt-1 text-[15px] italic">
                                                    « {tasting.note} »
                                                </p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>

                    {siblings.length > 0 && (
                        <Card title="Ailleurs dans ta cave">
                            <ul className="space-y-2">
                                {siblings.map((sibling) => (
                                    <li key={sibling.id}>
                                        <Link
                                            href={wines.show(sibling.id)}
                                            className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-accent/60"
                                        >
                                            <WineAvatar
                                                category={sibling.category}
                                                region={sibling.region}
                                                photoUrl={sibling.photoUrl}
                                                size="sm"
                                            />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate font-semibold">
                                                    {sibling.vintage ??
                                                        'Non millésimé'}{' '}
                                                    · {sibling.quantity}{' '}
                                                    {unitWord(
                                                        catalog,
                                                        sibling.quantity,
                                                        sibling.format,
                                                    )}
                                                </span>
                                                <span className="block truncate text-[13px] text-muted-foreground">
                                                    {sibling.location
                                                        ? `${sibling.location.cellarName} › ${sibling.location.compartmentName}`
                                                        : 'À ranger'}
                                                </span>
                                            </span>
                                            <WindowBadge
                                                window={sibling.window}
                                            />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    <Card title="Historique">
                        {movements.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Pas encore d’historique.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {movements.map((movement) => (
                                    <MovementEntry
                                        key={movement.id}
                                        movement={movement}
                                        compact
                                    />
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                <aside className="space-y-4 lg:sticky lg:top-10 lg:self-start">
                    <div className="hidden lg:block">{actions}</div>

                    <div className="surface p-5">
                        <h2 className="mb-3 font-display text-lg font-bold">
                            📍{' '}
                            {wine.location ? 'Elle se trouve ici' : 'À ranger'}
                        </h2>
                        {wine.location && cellar ? (
                            <>
                                <div className="flex justify-center rounded-2xl bg-muted/40 py-5">
                                    <CellarVisual
                                        type={cellar.type}
                                        color={cellar.color}
                                        name={cellar.name}
                                        size="sm"
                                        selectedId={wine.location.compartmentId}
                                        compartments={cellar.compartments.map(
                                            (compartment) => ({
                                                id: compartment.id,
                                                name: compartment.name,
                                                units: compartment.units,
                                                capacity: compartment.capacity,
                                            }),
                                        )}
                                    />
                                </div>
                                <div className="mt-3 flex justify-center">
                                    <LocationPill
                                        location={wine.location}
                                        wineId={wine.id}
                                        link={false}
                                    />
                                </div>
                                <Button
                                    asChild
                                    variant="outline"
                                    className="mt-3 w-full"
                                >
                                    <Link
                                        href={cellarRoutes.show(
                                            wine.location.cellarId,
                                            {
                                                query: {
                                                    compartment:
                                                        wine.location
                                                            .compartmentId,
                                                    item: wine.id,
                                                },
                                            },
                                        )}
                                    >
                                        Ouvrir la cave →
                                    </Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    Sa cave a été supprimée : choisis-lui une
                                    nouvelle place.
                                </p>
                                {!finished && (
                                    <Button
                                        variant="outline"
                                        className="mt-3 w-full"
                                        onClick={open('move')}
                                    >
                                        Choisir un emplacement
                                    </Button>
                                )}
                            </>
                        )}
                    </div>

                    <Button
                        variant="ghost"
                        className="w-full"
                        onClick={open('label')}
                    >
                        <QrCode />
                        Collerette à imprimer
                    </Button>
                </aside>
            </div>

            <DrinkSheet wine={drinking} onClose={() => setDrinking(null)} />
            <GiftSheet
                key={`gift-${wine.quantity}`}
                wine={wine}
                open={sheet === 'gift'}
                onOpenChange={close}
            />
            <RestockSheet
                wine={wine}
                open={sheet === 'restock'}
                onOpenChange={close}
            />
            <MoveSheet
                key={`move-${wine.quantity}-${wine.compartmentId}`}
                wine={wine}
                cellars={cellars}
                open={sheet === 'move'}
                onOpenChange={close}
            />
            <DiscardSheet
                wine={wine}
                open={sheet === 'discard'}
                onOpenChange={close}
            />
            <LabelSheet
                wine={wine}
                open={sheet === 'label'}
                onOpenChange={close}
            />
            <DeleteSheet
                wine={wine}
                open={sheet === 'delete'}
                onOpenChange={close}
            />
        </>
    );
}

function Card({
    title,
    action,
    children,
    className,
}: {
    title: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('surface p-5', className)}>
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold">{title}</h2>
                {action}
            </div>
            {children}
        </section>
    );
}

function Detail({ label, value }: { label: string; value: string | null }) {
    if (!value) {
        return null;
    }

    return (
        <div>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 font-semibold">{value}</dd>
        </div>
    );
}

/** Frise de garde : millésime → début → fin, avec la position d’aujourd’hui. */
function Timeline({ wine }: { wine: Wine }) {
    const from = wine.drinkFrom;
    const until = wine.drinkUntil;

    if (!from || !until) {
        return null;
    }

    const year = currentYear();
    const start = Math.min(wine.vintage ?? from, from, year);
    const end = Math.max(until, year) + 1;
    const span = Math.max(1, end - start);
    const pos = (value: number) => `${((value - start) / span) * 100}%`;

    return (
        <div className="mt-5">
            <div className="relative h-3 rounded-full bg-muted">
                <div
                    className="absolute inset-y-0 rounded-full"
                    style={{
                        left: pos(from),
                        width: `calc(${pos(until + 1)} - ${pos(from)})`,
                        background:
                            'linear-gradient(90deg, var(--ready), var(--soon))',
                    }}
                />
                <div
                    className="absolute -top-1 bottom-[-4px] w-1 -translate-x-1/2 rounded-full bg-foreground"
                    style={{ left: pos(year + 0.5) }}
                    title="Aujourd’hui"
                />
            </div>
            <div className="relative mt-1.5 h-4 text-[11px] font-semibold text-muted-foreground tabular-nums">
                {wine.vintage && wine.vintage < from && (
                    <span className="absolute left-0">{wine.vintage}</span>
                )}
                <span
                    className="absolute -translate-x-1/2"
                    style={{ left: pos(from) }}
                >
                    {from}
                </span>
                <span
                    className="absolute -translate-x-1/2"
                    style={{ left: pos(until + 1) }}
                >
                    {until}
                </span>
            </div>
        </div>
    );
}

function Pairings({ category }: { category: Wine['category'] }) {
    const catalog = useCatalog();
    const dishes = catalog.dishes.filter(
        (dish) => (dish.weights[category] ?? 0) >= 2,
    );

    if (dishes.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm text-muted-foreground">Avec</span>
            {dishes.map((dish) => (
                <span
                    key={dish.value}
                    className="rounded-full bg-muted px-2.5 py-1 text-[13px] font-semibold"
                >
                    {dish.emoji} {dish.label}
                </span>
            ))}
        </div>
    );
}
