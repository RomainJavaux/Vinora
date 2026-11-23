import { Link, useHttp } from '@inertiajs/react';
import {
    AlertTriangle,
    Check,
    ChevronRight,
    ScanText,
    Sparkles,
    Undo2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Fragment, useState } from 'react';
import { edit as editLabelReader } from '@/routes/label-reader';
import wines from '@/routes/wines';
import type { AgingValue, CategoryValue, FormatValue } from '@/types/models';

/** What Claude read on the label (null: not read). */
export type LabelFields = {
    name: string | null;
    producer: string | null;
    vintage: number | null;
    appellation: string | null;
    region: string | null;
    country: string | null;
    category: CategoryValue | null;
    grapes: string[];
    grapesInferred: boolean;
    alcohol: number | null;
    format: FormatValue | null;
    aging: AgingValue | null;
};

function messageOf(data: string | Record<string, unknown>): string | null {
    try {
        const body = typeof data === 'string' ? JSON.parse(data) : data;

        return typeof body?.message === 'string' ? body.message : null;
    } catch {
        return null;
    }
}

/**
 * Sends a label photo to « Lire l’étiquette ». The request goes through
 * Vinora, which calls Claude with the user's own key.
 */
export function useLabelReader(onRead: (fields: LabelFields) => void) {
    const http = useHttp<{ photo: File | null }, { fields: LabelFields }>({
        photo: null,
    });
    const [error, setError] = useState<string | null>(null);

    const read = async (photo: File) => {
        setError(null);
        http.transform(() => ({ photo }));

        try {
            await http.post(wines.readLabel.url(), {
                onSuccess: (response) => onRead(response.fields),
                onError: (errors) =>
                    setError(
                        errors.photo ?? 'Cette étiquette n’a pas pu être lue.',
                    ),
                onHttpException: (response) => {
                    setError(
                        messageOf(response.data) ??
                            'Cette étiquette n’a pas pu être lue. Réessaie.',
                    );
                },
                onNetworkError: () =>
                    setError(
                        'Pas de connexion : la lecture d’étiquette a besoin d’internet.',
                    ),
            });
        } catch {
            // Already shown through the callbacks above.
        }
    };

    return {
        read,
        reading: http.processing,
        error,
        clearError: () => setError(null),
    };
}

/** Scanning light over the photo while Claude reads it. */
export function LabelScanOverlay({ active }: { active: boolean }) {
    return (
        <AnimatePresence>
            {active && (
                <motion.div
                    className="absolute inset-0 z-10 overflow-hidden bg-black/45 text-white backdrop-blur-[1px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    role="status"
                >
                    <motion.span
                        className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-white/35 to-transparent"
                        initial={{ top: '-30%' }}
                        animate={{ top: ['-30%', '100%'] }}
                        transition={{
                            duration: 1.6,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                        aria-hidden
                    />
                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
                        <motion.span
                            animate={{ scale: [1, 1.12, 1] }}
                            transition={{ duration: 1.4, repeat: Infinity }}
                            aria-hidden
                        >
                            <ScanText className="size-9" />
                        </motion.span>
                        <span className="font-display text-lg font-bold">
                            Lecture de l’étiquette…
                        </span>
                        <span className="text-[13px] text-white/80">
                            Claude déchiffre le nom, le millésime et
                            l’appellation
                        </span>
                    </span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/** A value read on the label, as applied to the form. */
export type LabelReadRow = { key: string; label: string; value: string };

/** An important field the label did not give: what the form keeps instead. */
export type LabelMissing = { key: string; label: string; note: string };

/** What was read on the label, with its values, and what is still missing. */
export function LabelReadBanner({
    rows,
    missing,
    onUndo,
    onFix,
    onConfirm,
}: {
    rows: LabelReadRow[];
    missing: LabelMissing[];
    onUndo: () => void;
    /** Takes the user to the field to complete. */
    onFix: (key: string) => void;
    /** The value kept instead is the right one: no longer flagged. */
    onConfirm: (key: string) => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl bg-primary/8 p-3.5 text-[14px]"
            role="status"
        >
            <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="min-w-0 flex-1 font-semibold">
                    {rows.length > 0
                        ? 'Lu sur l’étiquette : vérifie avant de ranger.'
                        : 'Rien de lisible sur cette étiquette.'}
                </p>
                {rows.length > 0 && (
                    <button
                        type="button"
                        onClick={onUndo}
                        className="-my-1 flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                    >
                        <Undo2 className="size-3.5" />
                        Annuler
                    </button>
                )}
            </div>

            {rows.length > 0 && (
                <dl className="mt-2.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 pl-7">
                    {rows.map((row) => (
                        <Fragment key={row.key}>
                            <dt className="text-muted-foreground">
                                {row.label}
                            </dt>
                            <dd className="min-w-0 font-semibold break-words">
                                {row.value}
                            </dd>
                        </Fragment>
                    ))}
                </dl>
            )}

            <AnimatePresence initial={false}>
                {missing.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-3 ml-7 rounded-xl bg-[color-mix(in_oklab,var(--soon)_16%,transparent)] p-2.5">
                            <p className="flex items-center gap-1.5 px-1 text-[13px] font-bold">
                                <AlertTriangle
                                    className="size-3.5 shrink-0"
                                    style={{ color: 'var(--soon)' }}
                                />
                                Pas trouvé sur l’étiquette, à vérifier :
                            </p>
                            <ul className="mt-1 space-y-0.5">
                                {missing.map((item) => (
                                    <li
                                        key={item.key}
                                        className="flex items-center gap-1"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => onFix(item.key)}
                                            className="flex min-h-9 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-left text-[13px] transition-colors hover:bg-background/60"
                                        >
                                            <span className="min-w-0">
                                                <b className="font-semibold">
                                                    {item.label}
                                                </b>
                                                <span className="text-muted-foreground">
                                                    {' '}
                                                    · {item.note}
                                                </span>
                                            </span>
                                            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onConfirm(item.key)}
                                            aria-label={`${item.label} : c’est bon`}
                                            className="flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
                                        >
                                            <Check className="size-3.5" />
                                            C’est bon
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

/** Invitation to set up label reading, for users without a key. */
export function LabelReaderTip() {
    return (
        <p className="flex items-start gap-2 text-[13px] text-muted-foreground">
            <ScanText className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>
                Vinora peut remplir la fiche depuis la photo de l’étiquette,
                avec ta propre clé Anthropic.{' '}
                <Link
                    href={editLabelReader()}
                    className="font-semibold text-primary"
                >
                    Activer la lecture
                </Link>
            </span>
        </p>
    );
}
