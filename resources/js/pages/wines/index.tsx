import { Head, Link } from '@inertiajs/react';
import {
    ChevronDown,
    Download,
    FileSpreadsheet,
    Plus,
    RotateCcw,
    Search,
    Upload,
    X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { EmptyState, PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Segmented } from '@/components/ui/segmented';
import { DrinkSheet } from '@/components/wines/drink-sheet';
import { WineRow } from '@/components/wines/wine-row';
import {
    findCategory,
    findColor,
    gradient,
    isUrgent,
    useCatalog,
} from '@/lib/catalog';
import { timeAgo } from '@/lib/dates';
import { matches } from '@/lib/search';
import { cn } from '@/lib/utils';
import wines from '@/routes/wines';
import type { CategoryValue, PaletteKey, Wine } from '@/types/models';

type Props = {
    items: Wine[];
    finished: Wine[];
    cellars: { id: number; name: string; color: PaletteKey; type: string }[];
};

type Sort = 'window' | 'vintage' | 'name' | 'recent';

export default function WinesIndex({ items, finished, cellars }: Props) {
    const catalog = useCatalog();
    const searchRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const deferred = useDeferredValue(query);
    const [tab, setTab] = useState<'stock' | 'finished'>('stock');
    const [sort, setSort] = useState<Sort>('window');
    const [urgentOnly, setUrgentOnly] = useState(false);
    const [youngOnly, setYoungOnly] = useState(false);
    const [keptOnly, setKeptOnly] = useState(false);
    const [cellarId, setCellarId] = useState<number | null>(null);
    const [category, setCategory] = useState<CategoryValue | null>(null);
    // The lots of the wine being opened (several when it is in several places).
    const [drinking, setDrinking] = useState<Wine[] | null>(null);

    useEffect(() => {
        if (new URLSearchParams(window.location.search).get('focus') === '1') {
            searchRef.current?.focus();
        }
    }, []);

    const haystack = (wine: Wine) => [
        wine.name,
        wine.producer,
        wine.appellation,
        wine.region,
        wine.country,
        wine.vintage ? String(wine.vintage) : 'non millesime',
        wine.description,
        wine.boughtFrom,
        ...wine.grapes,
        ...wine.tags,
        findCategory(catalog, wine.category).label,
        wine.location?.compartmentName,
        wine.location?.cellarName,
    ];

    const urgentCount = items.filter((wine) =>
        isUrgent(wine.window.status),
    ).length;
    const youngCount = items.filter(
        (wine) => wine.window.status === 'young',
    ).length;
    const keptCount = items.filter((wine) => wine.keepsake).length;
    const presentCategories = catalog.categories.filter((option) =>
        items.some((wine) => wine.category === option.value),
    );

    const sortWines = (list: Wine[]) =>
        [...list].sort((a, b) => {
            switch (sort) {
                case 'name':
                    return a.name.localeCompare(b.name, 'fr');
                case 'vintage':
                    return (a.vintage ?? 9999) - (b.vintage ?? 9999);
                case 'recent':
                    return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
                default:
                    // Bottles kept aside come last: they are not to be drunk.
                    return (
                        Number(a.keepsake) - Number(b.keepsake) ||
                        (a.drinkUntil ?? 9999) - (b.drinkUntil ?? 9999) ||
                        a.name.localeCompare(b.name, 'fr')
                    );
            }
        });

    const source = tab === 'stock' ? items : finished;
    const filtered = source.filter(
        (wine) =>
            matches(deferred, haystack(wine)) &&
            (tab === 'finished' ||
                ((!urgentOnly || isUrgent(wine.window.status)) &&
                    (!youngOnly || wine.window.status === 'young') &&
                    (!keptOnly || wine.keepsake) &&
                    (!cellarId || wine.location?.cellarId === cellarId) &&
                    (!category || wine.category === category))),
    );

    const results = tab === 'finished' ? filtered : sortWines(filtered);

    // The same wine stored in several places is shown once, with every place.
    const groups =
        tab === 'stock'
            ? results.reduce<Wine[][]>((list, wine) => {
                  const group = list.find((lots) => sameWine(lots[0], wine));

                  if (group) {
                      group.push(wine);
                  } else {
                      list.push([wine]);
                  }

                  return list;
              }, [])
            : results.map((wine) => [wine]);

    const filtering =
        urgentOnly ||
        youngOnly ||
        keptOnly ||
        cellarId !== null ||
        category !== null ||
        query !== '';
    const units = results.reduce((sum, wine) => sum + wine.quantity, 0);

    const reset = () => {
        setQuery('');
        setUrgentOnly(false);
        setYoungOnly(false);
        setKeptOnly(false);
        setCellarId(null);
        setCategory(null);
    };

    return (
        <>
            <Head title="Bouteilles" />

            <PageHeader
                overline="Tout ce qui est en cave"
                title="Bouteilles"
                actions={
                    <>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="h-9 rounded-xl px-3.5 text-sm lg:h-11 lg:rounded-2xl lg:px-5 lg:text-[15px]"
                                >
                                    <FileSpreadsheet />
                                    Excel
                                    <ChevronDown className="-mr-1 size-4 opacity-60" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                <DropdownMenuItem asChild>
                                    <a href={wines.export.url()} download>
                                        <Download />
                                        <span>
                                            Exporter en Excel
                                            <span className="block text-[12px] font-normal text-muted-foreground">
                                                Tous les vins, avec l’historique
                                            </span>
                                        </span>
                                    </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href={wines.import()}>
                                        <Upload />
                                        <span>
                                            Importer un fichier
                                            <span className="block text-[12px] font-normal text-muted-foreground">
                                                Ajouter ou modifier des vins
                                            </span>
                                        </span>
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                            asChild
                            variant="warm"
                            className="hidden lg:inline-flex"
                        >
                            <Link href={wines.create()}>
                                <Plus />
                                Ranger une bouteille
                            </Link>
                        </Button>
                    </>
                }
            />

            <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 -mx-4 mb-4 px-4 pt-1 pb-3 sm:-mx-6 sm:px-6 lg:top-0 lg:mx-0 lg:px-0 lg:pt-4">
                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-muted-foreground" />
                    <input
                        ref={searchRef}
                        type="text"
                        inputMode="search"
                        enterKeyHint="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Margaux, 2016, pinot, clayette 3…"
                        className="glass-strong h-14 w-full rounded-[22px] pr-12 pl-12 text-base outline-none placeholder:text-muted-foreground/70 focus:ring-4 focus:ring-ring/20"
                        aria-label="Rechercher une bouteille"
                    />
                    <AnimatePresence>
                        {query && (
                            <motion.button
                                type="button"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                onClick={() => {
                                    setQuery('');
                                    searchRef.current?.focus();
                                }}
                                className="absolute top-1/2 right-3 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground"
                                aria-label="Effacer"
                            >
                                <X className="size-4" />
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <Segmented
                    aria-label="Stock"
                    value={tab}
                    onChange={setTab}
                    options={[
                        {
                            value: 'stock',
                            label: 'En cave',
                            count: items.length,
                        },
                        {
                            value: 'finished',
                            label: 'Terminées',
                            count: finished.length,
                        },
                    ]}
                />
                {tab === 'stock' && (
                    <Segmented
                        compact
                        aria-label="Tri"
                        value={sort}
                        onChange={setSort}
                        options={[
                            { value: 'window', label: 'Apogée' },
                            { value: 'vintage', label: 'Millésime' },
                            { value: 'name', label: 'A → Z' },
                            { value: 'recent', label: 'Récents' },
                        ]}
                    />
                )}
            </div>

            {tab === 'stock' && (
                <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:px-0">
                    {urgentCount > 0 && (
                        <Chip
                            active={urgentOnly}
                            color="var(--soon)"
                            onClick={() => setUrgentOnly((value) => !value)}
                            emoji="⏳"
                        >
                            À boire vite · {urgentCount}
                        </Chip>
                    )}
                    {youngCount > 0 && (
                        <Chip
                            active={youngOnly}
                            color="var(--young)"
                            onClick={() => setYoungOnly((value) => !value)}
                            emoji="🌱"
                        >
                            Trop jeunes · {youngCount}
                        </Chip>
                    )}
                    {keptCount > 0 && (
                        <Chip
                            active={keptOnly}
                            color="var(--keep)"
                            onClick={() => setKeptOnly((value) => !value)}
                            emoji="🎁"
                        >
                            À garder · {keptCount}
                        </Chip>
                    )}
                    {cellars.length > 1 &&
                        cellars.map((cellar) => (
                            <Chip
                                key={cellar.id}
                                active={cellarId === cellar.id}
                                color={gradient(
                                    findColor(catalog, cellar.color),
                                )}
                                onClick={() =>
                                    setCellarId((value) =>
                                        value === cellar.id ? null : cellar.id,
                                    )
                                }
                            >
                                {cellar.name}
                            </Chip>
                        ))}
                    {presentCategories.map((option) => (
                        <Chip
                            key={option.value}
                            emoji={option.emoji}
                            active={category === option.value}
                            color={option.color}
                            onClick={() =>
                                setCategory((value) =>
                                    value === option.value
                                        ? null
                                        : option.value,
                                )
                            }
                        >
                            {option.short}
                        </Chip>
                    ))}
                </div>
            )}

            <div className="mb-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <p>
                    <strong className="text-foreground tabular-nums">
                        {groups.length}
                    </strong>{' '}
                    référence{groups.length > 1 ? 's' : ''}
                    {tab === 'stock' && (
                        <>
                            {' · '}
                            <strong className="text-foreground tabular-nums">
                                {units}
                            </strong>{' '}
                            bouteille{units > 1 ? 's' : ''}
                        </>
                    )}
                </p>
                {filtering && (
                    <button
                        type="button"
                        onClick={reset}
                        className="flex items-center gap-1 font-semibold text-primary"
                    >
                        <RotateCcw className="size-3.5" />
                        Réinitialiser
                    </button>
                )}
            </div>

            {tab === 'stock' && items.length === 0 ? (
                <EmptyState
                    emoji="🍾"
                    title="Ta cave est vide"
                    description="Range ta première bouteille : photo de l’étiquette, millésime, et on s’occupe de te dire quand l’ouvrir."
                    action={
                        <div className="flex flex-col items-center gap-2 sm:flex-row">
                            <Button asChild variant="warm">
                                <Link href={wines.create()}>
                                    Ranger une bouteille
                                </Link>
                            </Button>
                            <Button asChild variant="ghost">
                                <Link href={wines.import()}>
                                    <FileSpreadsheet />
                                    Importer un fichier Excel
                                </Link>
                            </Button>
                        </div>
                    }
                />
            ) : tab === 'finished' && finished.length === 0 ? (
                <EmptyState
                    emoji="🥂"
                    title="Rien de terminé pour l’instant"
                    description="Les bouteilles bues ou offertes apparaîtront ici, prêtes à être rachetées."
                />
            ) : results.length === 0 ? (
                <EmptyState
                    emoji="🔍"
                    title="Introuvable…"
                    description={
                        query
                            ? `Aucun résultat pour « ${query} ». Peut-être déjà bue ?`
                            : 'Aucune bouteille ne correspond à ces filtres.'
                    }
                    action={
                        <Button variant="outline" onClick={reset}>
                            Effacer les filtres
                        </Button>
                    }
                />
            ) : (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <AnimatePresence mode="popLayout">
                        {groups.map(([wine, ...others], index) =>
                            tab === 'stock' ? (
                                <WineRow
                                    key={wine.id}
                                    wine={wine}
                                    lots={[wine, ...others]}
                                    index={index}
                                    onDrink={() =>
                                        setDrinking([wine, ...others])
                                    }
                                />
                            ) : (
                                <WineRow
                                    key={wine.id}
                                    wine={wine}
                                    index={index}
                                    muted
                                    showLocation={false}
                                    subtitle={
                                        <span className="text-[13px] text-muted-foreground">
                                            Terminée {timeAgo(wine.finishedAt)}
                                            {wine.rating
                                                ? ` · ★ ${wine.rating.toLocaleString('fr-FR')}`
                                                : ''}
                                        </span>
                                    }
                                    action={
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="outline"
                                            className={cn(
                                                'relative z-10 shrink-0',
                                            )}
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
                                    }
                                />
                            ),
                        )}
                    </AnimatePresence>
                </div>
            )}

            <DrinkSheet
                wine={drinking?.[0] ?? null}
                choices={drinking ?? undefined}
                onClose={() => setDrinking(null)}
            />
        </>
    );
}

/** Same cuvée, vintage and format: the same wine in another place. */
function sameWine(a: Wine, b: Wine): boolean {
    const key = (wine: Wine) =>
        [
            wine.name,
            wine.producer ?? '',
            wine.vintage ?? '',
            wine.format,
            wine.category,
        ]
            .join('|')
            .toLowerCase();

    return key(a) === key(b);
}
