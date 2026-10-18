import { Form, Head } from '@inertiajs/react';
import { KeyRound, ScanText, ShieldCheck, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import LabelReaderController from '@/actions/App/Http/Controllers/Settings/LabelReaderController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type Props = {
    configured: boolean;
    hint: string | null;
};

export default function LabelReaderSettings({ configured, hint }: Props) {
    const [replacing, setReplacing] = useState(false);
    const showForm = !configured || replacing;

    return (
        <>
            <Head title="Lecture d’étiquette" />

            <section className="surface p-6">
                <div className="flex items-start gap-4">
                    <motion.span
                        className="flex size-14 shrink-0 items-center justify-center rounded-[20px] bg-primary/10 text-primary"
                        animate={{ rotate: [0, -6, 6, 0] }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                        aria-hidden
                    >
                        <ScanText className="size-7" />
                    </motion.span>
                    <div className="min-w-0">
                        <h2 className="font-display text-lg font-bold">
                            Lecture d’étiquette
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Prends l’étiquette en photo : Claude, l’IA
                            d’Anthropic, remplit la fiche (nom, domaine,
                            millésime, appellation…) et tu n’as plus qu’à
                            vérifier.
                        </p>
                    </div>
                </div>

                <div className="mt-5 rounded-2xl bg-muted/60 p-4 text-[14px]">
                    <p className="flex gap-2.5">
                        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span className="min-w-0 text-muted-foreground">
                            <b className="font-semibold text-foreground">
                                Ta clé, ton compte.
                            </b>{' '}
                            Chaque lecture passe par ta propre clé d’API et est
                            facturée sur ton compte Anthropic, environ 2
                            centimes la photo. Elle est chiffrée, jamais
                            réaffichée, et personne d’autre ne s’en sert, même
                            dans tes lieux partagés.
                        </span>
                    </p>
                </div>

                {configured && !replacing && (
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                        <span className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[color-mix(in_oklab,var(--ready)_14%,transparent)] px-4 text-[15px] font-semibold">
                            <span
                                className="size-2 rounded-full"
                                style={{ background: 'var(--ready)' }}
                                aria-hidden
                            />
                            Clé active
                            <span className="font-mono text-[13px] text-muted-foreground">
                                {hint}
                            </span>
                        </span>
                        <Button
                            variant="outline"
                            onClick={() => setReplacing(true)}
                        >
                            <KeyRound />
                            Remplacer
                        </Button>
                        <Form {...LabelReaderController.destroy.form()}>
                            {({ processing }) => (
                                <Button
                                    type="submit"
                                    variant="ghost"
                                    className="text-destructive"
                                    disabled={processing}
                                >
                                    {processing ? <Spinner /> : <Trash2 />}
                                    Supprimer la clé
                                </Button>
                            )}
                        </Form>
                    </div>
                )}

                {showForm && (
                    <>
                        {!configured && (
                            <ol className="mt-5 space-y-2.5 text-[14px]">
                                <Step number={1}>
                                    Crée un compte sur{' '}
                                    <a
                                        href="https://console.anthropic.com"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="font-semibold text-primary underline-offset-2 hover:underline"
                                    >
                                        console.anthropic.com
                                    </a>{' '}
                                    et ajoute un moyen de paiement (quelques
                                    euros de crédit suffisent pour des centaines
                                    d’étiquettes).
                                </Step>
                                <Step number={2}>
                                    Dans « API Keys », crée une clé{' '}
                                    <b className="font-semibold text-foreground">
                                        dans un workspace
                                    </b>{' '}
                                    (« Default » convient) et nomme-la Vinora.
                                </Step>
                                <Step number={3}>
                                    Colle-la ici : Vinora fait un tout petit
                                    essai (moins d’un dixième de centime) pour
                                    vérifier qu’elle peut lire des étiquettes.
                                </Step>
                            </ol>
                        )}

                        <Form
                            {...LabelReaderController.update.form()}
                            resetOnSuccess
                            onSuccess={() => setReplacing(false)}
                            options={{ preserveScroll: true }}
                            className="mt-5 space-y-3"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div className="grid gap-2">
                                        <Label htmlFor="key">
                                            Clé d’API Anthropic
                                        </Label>
                                        <Input
                                            id="key"
                                            name="key"
                                            type="password"
                                            placeholder="sk-ant-…"
                                            autoComplete="off"
                                            spellCheck={false}
                                            required
                                        />
                                        <InputError message={errors.key} />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing ? (
                                                <Spinner />
                                            ) : (
                                                <KeyRound />
                                            )}
                                            Vérifier et enregistrer
                                        </Button>
                                        {replacing && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() =>
                                                    setReplacing(false)
                                                }
                                            >
                                                Annuler
                                            </Button>
                                        )}
                                    </div>
                                </>
                            )}
                        </Form>
                    </>
                )}
            </section>
        </>
    );
}

function Step({ number, children }: { number: number; children: ReactNode }) {
    return (
        <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[13px] font-bold text-primary">
                {number}
            </span>
            <span className="min-w-0 pt-0.5 text-muted-foreground">
                {children}
            </span>
        </li>
    );
}
