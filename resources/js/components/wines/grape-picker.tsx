import { Plus, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { useCatalog } from '@/lib/catalog';
import { normalize } from '@/lib/search';
import { cn } from '@/lib/utils';
import type { CategoryValue, GrapeOption } from '@/types/models';

const MAX = 6;

/** Colour of grape that usually makes each style of wine. */
const GRAPE_COLOR: Partial<Record<CategoryValue, GrapeOption['color']>> = {
    red: 'red',
    fortified: 'red',
    white: 'white',
    sweet: 'white',
    orange: 'white',
};

const DOT: Record<GrapeOption['color'], string> = {
    red: '#7f1d2d',
    white: '#d8be62',
};

type Match = { grape: GrapeOption; alias: string | null };

/**
 * Grape varieties: the most common ones for the wine's colour and region,
 * and a search through the whole list (other names included: searching
 * « Shiraz » finds Syrah).
 */
export function GrapePicker({
    value,
    onChange,
    category,
    region,
    country,
}: {
    value: string[];
    onChange: (value: string[]) => void;
    category: CategoryValue;
    region: string;
    country: string;
}) {
    const catalog = useCatalog();
    const [query, setQuery] = useState('');
    const [browsing, setBrowsing] = useState(false);
    const full = value.length >= MAX;
    const search = normalize(query);
    const wanted = GRAPE_COLOR[category] ?? null;

    const toggle = (grape: string) => {
        if (value.includes(grape)) {
            onChange(value.filter((item) => item !== grape));
        } else if (!full) {
            onChange([...value, grape]);
        }
    };

    const results: Match[] = search
        ? catalog.grapes
              .map((grape): Match | null => {
                  if (normalize(grape.name).includes(search)) {
                      return { grape, alias: null };
                  }

                  const alias = grape.aliases.find((name) =>
                      normalize(name).includes(search),
                  );

                  return alias ? { grape, alias } : null;
              })
              .filter((match): match is Match => match !== null)
              .sort(
                  (a, b) =>
                      Number(
                          !normalize(a.alias ?? a.grape.name).startsWith(
                              search,
                          ),
                      ) -
                          Number(
                              !normalize(b.alias ?? b.grape.name).startsWith(
                                  search,
                              ),
                          ) ||
                      Number(!a.grape.popular) - Number(!b.grape.popular),
              )
              .slice(0, 24)
        : [];

    // Grapes of the wine's region come first, then the most common ones.
    const place = normalize(`${region} ${country === 'France' ? '' : country}`);
    const local = (grape: GrapeOption) =>
        place !== '' && place.includes(normalize(grape.origin));
    const suggestions = catalog.grapes
        .filter(
            (grape) =>
                !value.includes(grape.name) &&
                (!wanted || grape.color === wanted) &&
                (local(grape) || grape.popular),
        )
        .sort(
            (a, b) =>
                Number(!local(a)) - Number(!local(b)) ||
                Number(!a.popular) - Number(!b.popular),
        )
        .slice(0, 14);
    const hasLocal = suggestions.some(local);

    const addTyped = () => {
        const first = results[0]?.grape.name;
        const typed = query.trim();

        // Enter picks the best match: « syr » gives Syrah.
        if (first) {
            toggle(first);
        } else if (typed) {
            toggle(typed);
        }

        setQuery('');
    };

    const chip = ({ grape, alias }: Match) => (
        <Chip
            key={grape.name}
            size="sm"
            active={value.includes(grape.name)}
            disabled={full && !value.includes(grape.name)}
            onClick={() => toggle(grape.name)}
            icon={
                <span
                    className="size-2 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ background: DOT[grape.color] }}
                    aria-hidden
                />
            }
            title={`${grape.name} · ${grape.origin}${grape.aliases.length > 0 ? ` · aussi appelé ${grape.aliases.join(', ')}` : ''}`}
        >
            {grape.name}
            {alias && <span className="font-normal opacity-70">· {alias}</span>}
        </Chip>
    );

    return (
        <div>
            <p className="mb-2 text-sm font-semibold">
                Cépages{' '}
                <span className="font-normal text-muted-foreground">
                    ({value.length}/{MAX})
                </span>
            </p>

            <AnimatePresence initial={false}>
                {value.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-2 flex flex-wrap gap-1.5 overflow-hidden"
                    >
                        {value.map((grape) => (
                            <button
                                key={grape}
                                type="button"
                                onClick={() => toggle(grape)}
                                className="flex h-8 items-center gap-1 rounded-full bg-primary px-3 text-[13px] font-semibold text-primary-foreground"
                                aria-label={`Retirer ${grape}`}
                            >
                                {grape}
                                <X className="size-3" />
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-[18px] -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ',') {
                            event.preventDefault();
                            addTyped();
                        }
                    }}
                    placeholder={`Rechercher parmi ${catalog.grapes.length} cépages…`}
                    className="pr-10 pl-10"
                    maxLength={40}
                    enterKeyHint="done"
                    aria-label="Rechercher un cépage"
                />
                {query && (
                    <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="absolute top-1/2 right-2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
                        aria-label="Effacer la recherche"
                    >
                        <X className="size-4" />
                    </button>
                )}
            </div>

            {full && (
                <p className="mt-2 text-[12px] text-muted-foreground">
                    {MAX} cépages au maximum : retires-en un pour en ajouter un
                    autre.
                </p>
            )}

            {search ? (
                <div className="mt-2 flex flex-wrap gap-2">
                    {results.map(chip)}
                    {results.length === 0 && query.trim() !== '' && !full && (
                        <Chip
                            size="sm"
                            onClick={addTyped}
                            icon={<Plus className="size-3.5" />}
                        >
                            Ajouter « {query.trim()} »
                        </Chip>
                    )}
                    {results.length === 0 && (
                        <p className="w-full text-[12px] text-muted-foreground">
                            Pas dans la liste : Entrée pour l’ajouter tel quel.
                        </p>
                    )}
                </div>
            ) : (
                <>
                    <p className="mt-3 mb-2 text-[12px] font-semibold text-muted-foreground">
                        {hasLocal
                            ? `Souvent dans la région · ${region || country}`
                            : wanted === 'red'
                              ? 'Cépages rouges courants'
                              : wanted === 'white'
                                ? 'Cépages blancs courants'
                                : 'Les plus courants'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.map((grape) =>
                            chip({ grape, alias: null }),
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setBrowsing((open) => !open)}
                        className="mt-2 text-sm font-semibold text-primary hover:underline"
                        aria-expanded={browsing}
                    >
                        {browsing
                            ? 'Masquer la liste'
                            : `Parcourir les ${catalog.grapes.length} cépages`}
                    </button>
                    <AnimatePresence initial={false}>
                        {browsing && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-2 max-h-80 space-y-3 overflow-y-auto rounded-2xl border border-border p-3">
                                    {(['red', 'white'] as const).map(
                                        (color) => (
                                            <div key={color}>
                                                <p
                                                    className={cn(
                                                        'sticky top-0 z-[1] -mx-1 mb-1.5 bg-card/95 px-1 py-0.5 text-[12px] font-bold backdrop-blur',
                                                    )}
                                                >
                                                    {color === 'red'
                                                        ? 'Rouges'
                                                        : 'Blancs'}
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {catalog.grapes
                                                        .filter(
                                                            (grape) =>
                                                                grape.color ===
                                                                color,
                                                        )
                                                        .map((grape) =>
                                                            chip({
                                                                grape,
                                                                alias: null,
                                                            }),
                                                        )}
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </div>
    );
}
