import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
    LABEL_FORMATS,
    WineLabel,
    useWineQr,
} from '@/components/wines/print-label';
import type { LabelFormat } from '@/components/wines/print-label';
import { cn } from '@/lib/utils';
import wines from '@/routes/wines';
import type { Wine } from '@/types/models';

/**
 * Print-only page: the page itself is sized to the label so the printer
 * gets exactly one label, without margins nor blank pages.
 */
export default function WineLabelPage({
    wine,
    format,
}: {
    wine: Wine;
    format: LabelFormat;
}) {
    const qr = useWineQr(wine);
    const printed = useRef(false);
    const { width, height } = LABEL_FORMATS[format];

    useEffect(() => {
        if (qr && !printed.current) {
            printed.current = true;
            // Fonts must be in to size the name; then let the browser paint.
            void document.fonts.ready.then(() =>
                window.setTimeout(() => window.print(), 150),
            );
        }
    }, [qr]);

    return (
        <>
            <Head title={`Étiquette ${wine.name}`} />
            <style>{`
                @page { size: ${width}mm ${height}mm; margin: 0; }
                @media print {
                    /* Exactly one page, whatever paper the driver really uses. */
                    html, body, #app, .label-page {
                        margin: 0 !important; padding: 0 !important; background: #fff !important;
                        width: 100vw !important; height: 100vh !important; min-height: 0 !important; overflow: hidden !important;
                    }
                    .label-page { display: block !important; }
                    .label-page > :not(.wine-label), [data-sonner-toaster] { display: none !important; }
                    .wine-label { box-shadow: none !important; }
                    /* The QR code fills the page and stays centred, even on a mismatched paper size. */
                    .wine-label[data-format="square"] {
                        width: 100vw !important; height: 100vh !important; padding: 0 !important;
                        display: grid !important; place-items: center;
                    }
                    .wine-label[data-format="square"] > * {
                        width: calc(min(100vw, 100vh) - 4mm) !important; height: calc(min(100vw, 100vh) - 4mm) !important;
                    }
                }
            `}</style>

            <div className="label-page flex min-h-svh flex-col items-center justify-center gap-6 bg-stone-200 p-6">
                <div className="no-print flex w-full max-w-md flex-wrap items-center justify-between gap-3">
                    <Link
                        href={wines.show.url(wine.id)}
                        className="flex items-center gap-1.5 text-sm font-semibold text-stone-700"
                    >
                        <ArrowLeft className="size-4" /> Retour
                    </Link>
                    <div className="flex rounded-xl bg-white p-1 text-sm font-semibold text-stone-600 shadow-sm">
                        {(Object.keys(LABEL_FORMATS) as LabelFormat[]).map(
                            (key) => (
                                <Link
                                    key={key}
                                    href={wines.label.url(wine.id, {
                                        query: { format: key },
                                    })}
                                    replace
                                    className={cn(
                                        'rounded-lg px-3 py-1.5',
                                        key === format &&
                                            'bg-stone-900 text-white',
                                    )}
                                >
                                    {LABEL_FORMATS[key].width} ×{' '}
                                    {LABEL_FORMATS[key].height}
                                </Link>
                            ),
                        )}
                    </div>
                </div>

                <WineLabel
                    wine={wine}
                    format={format}
                    qr={qr}
                    className="shadow-lg print:shadow-none"
                />

                <div className="no-print flex flex-col items-center gap-2">
                    <Button size="lg" onClick={() => window.print()}>
                        <Printer className="size-5" /> Imprimer
                    </Button>
                    <p className="max-w-xs text-center text-xs text-stone-600">
                        Choisis le format {width} × {height} mm dans les
                        réglages de ton imprimante, marges à zéro.
                    </p>
                </div>
            </div>
        </>
    );
}
