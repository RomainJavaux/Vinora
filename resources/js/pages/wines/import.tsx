import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Check,
    Download,
    FileSpreadsheet,
    Info,
    RefreshCw,
    Upload,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { WineAvatar } from '@/components/wines/wine-visuals';
import { formatQuantity, statusColor, useCatalog } from '@/lib/catalog';
import { cn } from '@/lib/utils';
import cellarRoutes from '@/routes/cellars';
import wines from '@/routes/wines';
import type { CategoryValue } from '@/types/models';

type Action = 'create' | 'update' | 'unchanged' | 'error';

type ImportRow = {
    row: number;
    action: Action;
    wineId: number | null;
    name: string;
    vintage: number | null;
    category: CategoryValue | null;
    quantity: number | null;
    format: string | null;
    place: string | null;
    changes: string[];
    errors: string[];
    warnings: string[];
};

type ImportPreview = {
    token: string;
    file: string;
    columns: string[];
    ignored: string[];
    notices: string[];
    rows: ImportRow[];
};

type Props = {
    preview: ImportPreview | null;
    expired: boolean;
    hasCellars: boolean;
    withPrices: boolean;
    maxRows: number;
    sheet: string;
};

const ACTIONS: Record<Action, { label: string; color: string }> = {
    create: {
        label: 'À ajouter',
        color: statusColor.ready,
    },
    update: {
        label: 'À modifier',
        color: statusColor.soon,
    },
    unchanged: {
        label: 'Inchangés',
        color: 'var(--muted-foreground)',
    },
    error: {
        label: 'En erreur',
        color: statusColor.past,
    },
};

const ACCEPT =
    '.xlsx,.xls,.ods,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.oasis.opendocument.spreadsheet,text/csv';

export default function WinesImport({
    preview,
    expired,
    hasCellars,
    withPrices,
    maxRows,
    sheet,
}: Props) {
    return (
        <>
            <Head title="Importer des vins" />

            <PageHeader
                back={{ href: wines.index(), label: 'Bouteilles' }}
                overline="Excel"
                title={
                    preview ? 'Vérifie avant d’importer' : 'Importer des vins'
                }
                description={
                    preview
                        ? 'Rien n’a encore changé dans ta cave : regarde ce que ce fichier va faire, puis confirme.'
                        : 'Modifie ton export dans Excel, ou pars de ta propre liste, puis dépose le fichier ici.'
                }
            />

            {preview ? (
                <Preview key={preview.token} preview={preview} />
            ) : (
                <UploadStep
                    expired={expired}
                    hasCellars={hasCellars}
                    withPrices={withPrices}
                    maxRows={maxRows}
                    sheet={sheet}
                />
            )}
        </>
    );
}

function UploadStep({
    expired,
    hasCellars,
    withPrices,
    maxRows,
    sheet,
}: Omit<Props, 'preview'>) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null);
    const [progress, setProgress] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const send = (file: File | undefined) => {
        if (!file || uploading) {
            return;
        }

        setError(null);
        router.post(
            wines.preview.url(),
            { file },
            {
                forceFormData: true,
                onStart: () => setUploading(file.name),
                onProgress: (event) => setProgress(event?.percentage ?? null),
                onError: (errors) =>
                    setError(
                        errors.file ??
                            'Ce fichier n’a pas pu être importé. Réessaie.',
                    ),
                onFinish: () => {
                    setUploading(null);
                    setProgress(null);

                    if (inputRef.current) {
                        inputRef.current.value = '';
                    }
                },
            },
        );
    };

    const onDrop = (event: DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        setDragging(false);
        send(event.dataTransfer.files[0]);
    };

    return (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <div className="space-y-4">
                {expired && (
                    <Notice tone="warning">
                        Cet aperçu a expiré : dépose le fichier une nouvelle
                        fois.
                    </Notice>
                )}

                {!hasCellars && (
                    <Notice tone="warning">
                        Tes vins ont besoin d’une cave.{' '}
                        <Link
                            href={cellarRoutes.create()}
                            className="font-bold underline underline-offset-2"
                        >
                            Crée-la d’abord
                        </Link>
                        , puis reviens importer ton fichier.
                    </Notice>
                )}

                <label
                    onDragOver={(event) => {
                        event.preventDefault();
                        setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    className={cn(
                        'surface relative flex min-h-72 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[28px] border-2 border-dashed px-6 py-12 text-center transition-colors',
                        dragging
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50',
                        uploading && 'pointer-events-none',
                    )}
                >
                    <motion.span
                        className="mb-5 flex size-18 items-center justify-center rounded-[26px] bg-primary/10 text-primary"
                        animate={
                            dragging
                                ? { scale: 1.12, rotate: -6 }
                                : { y: [0, -6, 0], scale: 1, rotate: 0 }
                        }
                        transition={
                            dragging
                                ? {
                                      type: 'spring',
                                      stiffness: 400,
                                      damping: 18,
                                  }
                                : {
                                      duration: 3.2,
                                      repeat: Infinity,
                                      ease: 'easeInOut',
                                  }
                        }
                        aria-hidden
                    >
                        <FileSpreadsheet className="size-9" />
                    </motion.span>
                    <span className="font-display text-xl font-bold text-balance">
                        {dragging
                            ? 'Lâche-le ici'
                            : 'Dépose ton fichier Excel ici'}
                    </span>
                    <span className="mt-1.5 text-[14px] text-muted-foreground">
                        ou choisis-le · .xlsx, .xls, .ods ou .csv
                    </span>
                    <span className="bg-gradient-primary mt-5 inline-flex h-11 items-center gap-2 rounded-2xl px-5 text-[15px] font-semibold text-primary-foreground shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--primary)_75%,transparent)]">
                        <Upload className="size-[18px]" />
                        Choisir un fichier
                    </span>
                    <input
                        ref={inputRef}
                        type="file"
                        accept={ACCEPT}
                        className="sr-only"
                        onChange={(event) => send(event.target.files?.[0])}
                        aria-label="Fichier Excel à importer"
                    />

                    <AnimatePresence>
                        {uploading && (
                            <motion.span
                                className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/85 px-6 backdrop-blur-sm"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <Spinner className="size-7 text-primary" />
                                <span className="max-w-full truncate font-semibold">
                                    Lecture de {uploading}…
                                </span>
                                <span className="h-1.5 w-48 overflow-hidden rounded-full bg-muted">
                                    <motion.span
                                        className="block h-full rounded-full bg-primary"
                                        initial={{ width: '8%' }}
                                        animate={{
                                            width: `${Math.max(8, progress ?? 60)}%`,
                                        }}
                                    />
                                </span>
                            </motion.span>
                        )}
                    </AnimatePresence>
                </label>

                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                        >
                            <Notice tone="error">{error}</Notice>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <aside className="space-y-4">
                <section className="surface rounded-[24px] p-5">
                    <h2 className="font-display text-lg font-bold">
                        Pars de ton export
                    </h2>
                    <p className="mt-1 text-[14px] text-muted-foreground">
                        Toutes tes bouteilles dans un fichier prêt à modifier,
                        avec des listes pour les couleurs, formats et caves.
                    </p>
                    <Button asChild variant="outline" className="mt-4 w-full">
                        <a href={wines.export.url()} download>
                            <Download />
                            Télécharger mon Excel
                        </a>
                    </Button>
                </section>

                <section className="surface rounded-[24px] p-5">
                    <h2 className="font-display text-lg font-bold">
                        Bon à savoir
                    </h2>
                    <ul className="mt-3 space-y-2.5 text-[14px]">
                        <Tip>
                            Garde la colonne <b>ID</b> pour modifier un vin,
                            laisse-la vide pour en ajouter un.
                        </Tip>
                        <Tip>
                            Une ligne = un emplacement : un vin rangé à deux
                            endroits occupe deux lignes.
                        </Tip>
                        <Tip>
                            <b>Quantité</b> à 0 : le vin passe dans les
                            bouteilles terminées.
                        </Tip>
                        <Tip>
                            Rien n’est supprimé : les vins absents du fichier
                            restent en cave.
                        </Tip>
                        <Tip>
                            Seul l’onglet « {sheet} » est lu, jusqu’à{' '}
                            {maxRows.toLocaleString('fr-FR')} lignes.
                        </Tip>
                        {!withPrices && (
                            <Tip>
                                Les prix ne sont pas importés : seuls les
                                gérants du lieu peuvent les modifier.
                            </Tip>
                        )}
                    </ul>
                </section>
            </aside>
        </div>
    );
}

type Filter = 'changes' | Action | 'all';

function Preview({ preview }: { preview: ImportPreview }) {
    const catalog = useCatalog();
    const count = (action: Action) =>
        preview.rows.filter((row) => row.action === action).length;
    const counts: Record<Action, number> = {
        create: count('create'),
        update: count('update'),
        unchanged: count('unchanged'),
        error: count('error'),
    };
    const toApply = counts.create + counts.update;
    const [filter, setFilter] = useState<Filter>(
        toApply + counts.error > 0 ? 'changes' : 'all',
    );
    const [limit, setLimit] = useState(60);
    const [sending, setSending] = useState(false);

    // Errors first: they are what needs attention.
    const rows = preview.rows
        .filter((row) =>
            filter === 'all'
                ? true
                : filter === 'changes'
                  ? row.action !== 'unchanged'
                  : row.action === filter,
        )
        .sort(
            (a, b) =>
                Number(a.action !== 'error') - Number(b.action !== 'error'),
        );
    const heading =
        filter === 'all'
            ? `${preview.rows.length.toLocaleString('fr-FR')} ligne${preview.rows.length > 1 ? 's' : ''}`
            : filter === 'changes'
              ? `${rows.length.toLocaleString('fr-FR')} changement${rows.length > 1 ? 's' : ''}`
              : `${counts[filter].toLocaleString('fr-FR')} ${ACTIONS[filter].label.toLowerCase()}`;

    const confirm = () => {
        router.post(
            wines.confirm.url(preview.token),
            {},
            {
                onStart: () => setSending(true),
                onFinish: () => setSending(false),
            },
        );
    };

    return (
        <>
            <div className="mb-4 flex min-w-0 items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <FileSpreadsheet className="size-5" />
                </span>
                <div className="min-w-0">
                    <p className="truncate font-semibold">{preview.file}</p>
                    <p className="text-[13px] text-muted-foreground">
                        {preview.rows.length.toLocaleString('fr-FR')} ligne
                        {preview.rows.length > 1 ? 's' : ''} lue
                        {preview.rows.length > 1 ? 's' : ''} ·{' '}
                        {preview.columns.length} colonnes reconnues
                    </p>
                </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {(Object.keys(ACTIONS) as Action[]).map((action, index) => (
                    <motion.button
                        key={action}
                        type="button"
                        onClick={() =>
                            setFilter(filter === action ? 'changes' : action)
                        }
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                            'surface relative overflow-hidden rounded-[22px] p-4 text-left transition-shadow hover:shadow-float',
                        )}
                        style={
                            filter === action
                                ? {
                                      boxShadow: `0 0 0 2px ${ACTIONS[action].color}`,
                                  }
                                : undefined
                        }
                        aria-pressed={filter === action}
                    >
                        <span
                            className="absolute top-0 left-0 h-full w-1"
                            style={{ background: ACTIONS[action].color }}
                            aria-hidden
                        />
                        <span className="block font-display text-[28px] leading-none font-extrabold tabular-nums">
                            {counts[action].toLocaleString('fr-FR')}
                        </span>
                        <span className="mt-1.5 block text-[13px] font-semibold text-muted-foreground">
                            {ACTIONS[action].label}
                        </span>
                    </motion.button>
                ))}
            </div>

            <div className="mb-4 space-y-2">
                {preview.notices.map((notice) => (
                    <Notice key={notice} tone="info">
                        {notice}
                    </Notice>
                ))}
                {preview.ignored.length > 0 && (
                    <Notice tone="info">
                        Colonnes ignorées : {preview.ignored.join(', ')}.
                    </Notice>
                )}
                {counts.error > 0 && (
                    <Notice tone="error">
                        {counts.error} ligne{counts.error > 1 ? 's' : ''} en
                        erreur{' '}
                        {counts.error > 1 ? 'seront ignorées' : 'sera ignorée'}.
                        Corrige-{counts.error > 1 ? 'les' : 'la'} dans le
                        fichier puis dépose-le à nouveau, ou importe le reste
                        tel quel.
                    </Notice>
                )}
            </div>

            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold">{heading}</h2>
                <Button
                    variant="ghost"
                    size="sm"
                    className="-mr-2 text-primary"
                    onClick={() =>
                        setFilter(filter === 'all' ? 'changes' : 'all')
                    }
                >
                    {filter === 'all'
                        ? 'Changements seulement'
                        : `Tout afficher (${preview.rows.length.toLocaleString('fr-FR')})`}
                </Button>
            </div>

            {rows.length === 0 ? (
                <div className="surface rounded-[24px] px-6 py-10 text-center">
                    <p className="text-3xl" aria-hidden>
                        🍷
                    </p>
                    <p className="mt-2 font-semibold">
                        {filter === 'changes'
                            ? 'Ta cave est déjà à jour avec ce fichier.'
                            : 'Aucune ligne ici.'}
                    </p>
                </div>
            ) : (
                <ul className="space-y-2.5">
                    {rows.slice(0, limit).map((row, index) => (
                        <RowItem
                            key={row.row}
                            row={row}
                            index={index}
                            quantity={
                                row.quantity !== null
                                    ? formatQuantity(
                                          catalog,
                                          row.quantity,
                                          row.format ?? 'standard',
                                      )
                                    : null
                            }
                        />
                    ))}
                </ul>
            )}

            {rows.length > limit && (
                <div className="mt-4 text-center">
                    <Button
                        variant="outline"
                        onClick={() => setLimit(limit + 100)}
                    >
                        Afficher {Math.min(100, rows.length - limit)} lignes de
                        plus
                    </Button>
                </div>
            )}

            <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-background/85 px-4 pt-3 backdrop-blur-xl lg:left-72">
                <div className="mx-auto flex max-w-6xl items-center gap-3 lg:px-6 lg:pb-3">
                    <p className="hidden min-w-0 flex-1 text-[14px] text-muted-foreground sm:block">
                        {toApply > 0 ? (
                            <>
                                <b className="text-foreground">
                                    {counts.create} ajout
                                    {counts.create > 1 ? 's' : ''}
                                </b>{' '}
                                et{' '}
                                <b className="text-foreground">
                                    {counts.update} modification
                                    {counts.update > 1 ? 's' : ''}
                                </b>{' '}
                                seront enregistrés.
                            </>
                        ) : (
                            'Rien à enregistrer.'
                        )}
                    </p>
                    <Button
                        asChild
                        variant="outline"
                        size="icon"
                        className="shrink-0 sm:w-auto sm:px-4"
                    >
                        <Link
                            href={wines.import()}
                            aria-label="Choisir un autre fichier"
                        >
                            <RefreshCw />
                            <span className="hidden sm:inline">
                                Autre fichier
                            </span>
                        </Link>
                    </Button>
                    <Button
                        className="min-w-0 flex-1 sm:flex-none"
                        onClick={confirm}
                        disabled={toApply === 0 || sending}
                    >
                        {sending ? <Spinner /> : <Check />}
                        {toApply > 0
                            ? `Importer ${toApply} vin${toApply > 1 ? 's' : ''}`
                            : 'Rien à importer'}
                    </Button>
                </div>
            </div>
        </>
    );
}

function RowItem({
    row,
    index,
    quantity,
}: {
    row: ImportRow;
    index: number;
    quantity: string | null;
}) {
    const action = ACTIONS[row.action];

    return (
        <motion.li
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index, 12) * 0.025 }}
            className={cn(
                'surface flex gap-3 rounded-[22px] p-3 pr-3.5',
                row.action === 'unchanged' && 'opacity-70',
            )}
        >
            <WineAvatar
                category={row.category ?? 'other'}
                vintage={row.vintage}
                size="sm"
                muted={row.action === 'error' || row.action === 'unchanged'}
            />
            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate font-display text-[15px] leading-tight font-bold">
                        {row.name || 'Sans nom'}
                        {row.vintage ? ` ${row.vintage}` : ''}
                    </p>
                    <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[12px] font-bold"
                        style={{
                            color: action.color,
                            background: `color-mix(in oklab, ${action.color} 14%, transparent)`,
                        }}
                    >
                        {action.label}
                    </span>
                </div>
                <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                    Ligne {row.row}
                    {quantity ? ` · ${quantity}` : ''}
                    {row.place ? ` · ${row.place}` : ''}
                </p>

                {row.changes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {row.changes.map((change) => (
                            <span
                                key={change}
                                className="rounded-full bg-muted px-2 py-0.5 text-[12px] font-semibold"
                            >
                                {change}
                            </span>
                        ))}
                    </div>
                )}

                {row.errors.length > 0 && (
                    <ul className="mt-2 space-y-1 text-[13px] font-medium text-destructive">
                        {row.errors.map((error) => (
                            <li key={error} className="flex gap-1.5">
                                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                                <span className="min-w-0">{error}</span>
                            </li>
                        ))}
                    </ul>
                )}

                {row.warnings.length > 0 && (
                    <ul className="mt-2 space-y-1 text-[13px] text-muted-foreground">
                        {row.warnings.map((warning) => (
                            <li key={warning} className="flex gap-1.5">
                                <Info className="mt-0.5 size-3.5 shrink-0" />
                                <span className="min-w-0">{warning}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </motion.li>
    );
}

function Notice({
    tone,
    children,
}: {
    tone: 'info' | 'warning' | 'error';
    children: ReactNode;
}) {
    const color =
        tone === 'error'
            ? statusColor.past
            : tone === 'warning'
              ? statusColor.soon
              : statusColor.young;
    const Icon = tone === 'info' ? Info : AlertTriangle;

    return (
        <div
            className="flex gap-2.5 rounded-2xl px-4 py-3 text-[14px]"
            style={{
                background: `color-mix(in oklab, ${color} 11%, transparent)`,
            }}
            role={tone === 'error' ? 'alert' : undefined}
        >
            <Icon className="mt-0.5 size-4 shrink-0" style={{ color }} />
            <div className="min-w-0">{children}</div>
        </div>
    );
}

function Tip({ children }: { children: ReactNode }) {
    return (
        <li className="flex gap-2.5">
            <span
                className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary"
                aria-hidden
            />
            <span className="min-w-0 text-muted-foreground [&_b]:font-semibold [&_b]:text-foreground">
                {children}
            </span>
        </li>
    );
}
