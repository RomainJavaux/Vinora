import QRCode from 'qrcode';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { findCategory, findFormat, useCatalog } from '@/lib/catalog';
import { cn } from '@/lib/utils';
import wines from '@/routes/wines';
import type { Wine } from '@/types/models';

export type LabelFormat = 'detailed' | 'square';

/**
 * Physical label sizes, width × height in millimetres (thermal label
 * printers: 90 × 38 mm address labels, 29 × 29 mm squares).
 */
export const LABEL_FORMATS: Record<
    LabelFormat,
    { width: number; height: number; name: string }
> = {
    detailed: { width: 90, height: 38, name: 'Détaillée' },
    square: { width: 29, height: 29, name: 'QR code' },
};

/** Pixels per millimetre at the CSS reference resolution (96 dpi). */
export const PX_PER_MM = 96 / 25.4;

/**
 * White border around the square QR code, in millimetres: label printers
 * cannot print the very edge of a 29 mm label, and the QR code needs a
 * quiet zone to be scanned.
 */
export const SQUARE_MARGIN = 4;

/**
 * Sharp SVG QR code pointing to the wine page.
 */
export function useWineQr(wine: Wine): string | null {
    const [svg, setSvg] = useState<string | null>(null);

    useEffect(() => {
        const url = `${window.location.origin}${wines.show.url(wine.id)}`;

        void QRCode.toString(url, {
            type: 'svg',
            margin: 0,
            errorCorrectionLevel: 'M',
            color: { dark: '#000000', light: '#ffffff' },
        }).then(setSvg);
    }, [wine.id]);

    return svg;
}

/** « 2022 → 2031 », « Dès 2028 », « Jusqu’en 2027 », « À garder ». */
function drinkWindow(wine: Wine): string {
    if (wine.keepsake) {
        return 'À garder';
    }

    if (wine.drinkFrom && wine.drinkUntil) {
        return wine.drinkFrom === wine.drinkUntil
            ? `En ${wine.drinkFrom}`
            : `${wine.drinkFrom} → ${wine.drinkUntil}`;
    }

    if (wine.drinkFrom) {
        return `Dès ${wine.drinkFrom}`;
    }

    if (wine.drinkUntil) {
        return `Jusqu’en ${wine.drinkUntil}`;
    }

    return '—';
}

/**
 * Black-on-white label drawn at its real size, made for thermal label
 * printers: the name as large as it fits, then what matters for a bottle,
 * its vintage and when to open it.
 */
export function WineLabel({
    wine,
    format,
    qr,
    className,
    style,
}: {
    wine: Wine;
    format: LabelFormat;
    qr: string | null;
    className?: string;
    style?: CSSProperties;
}) {
    const catalog = useCatalog();
    const { width, height } = LABEL_FORMATS[format];

    const code = (
        <div
            className="size-full [&_path]:[shape-rendering:crispEdges] [&>svg]:block [&>svg]:size-full"
            dangerouslySetInnerHTML={qr ? { __html: qr } : undefined}
        />
    );

    if (format === 'square') {
        return (
            <div
                data-format="square"
                className={cn('wine-label bg-white', className)}
                style={{
                    width: `${width}mm`,
                    height: `${height}mm`,
                    padding: `${SQUARE_MARGIN}mm`,
                    ...style,
                }}
            >
                {code}
            </div>
        );
    }

    const origin = [
        wine.appellation ?? wine.region,
        findCategory(catalog, wine.category).label,
        findFormat(catalog, wine.format).volume,
        wine.alcohol ? `${String(wine.alcohol).replace('.', ',')} %` : null,
    ].filter(Boolean);

    return (
        <div
            data-format="detailed"
            className={cn(
                'wine-label flex bg-white font-sans text-black',
                className,
            )}
            style={{
                width: `${width}mm`,
                height: `${height}mm`,
                padding: '2.5mm',
                gap: '3mm',
                ...style,
            }}
        >
            <div className="shrink-0" style={{ width: '33mm', height: '33mm' }}>
                {code}
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
                <FittedTitle text={wine.name} />
                {wine.producer && (
                    <div
                        className="shrink-0 truncate font-semibold"
                        style={{ fontSize: '7pt', marginTop: '0.4mm' }}
                    >
                        {wine.producer}
                    </div>
                )}

                <div className="mt-[1mm] shrink-0 border-t-[0.4mm] border-black pt-[1mm]">
                    <div className="flex items-end" style={{ gap: '3mm' }}>
                        <div className="shrink-0">
                            <div
                                className="font-bold uppercase"
                                style={{
                                    fontSize: '6pt',
                                    letterSpacing: '0.04em',
                                }}
                            >
                                Millésime
                            </div>
                            <div
                                className="leading-none font-extrabold tabular-nums"
                                style={{ fontSize: '17pt' }}
                            >
                                {wine.vintage ?? 'NM'}
                            </div>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div
                                className="font-bold uppercase"
                                style={{
                                    fontSize: '6pt',
                                    letterSpacing: '0.04em',
                                }}
                            >
                                {wine.keepsake ? 'Ne pas boire' : 'À boire'}
                            </div>
                            <div
                                className="truncate leading-none font-extrabold tabular-nums"
                                style={{
                                    fontSize: '11.5pt',
                                    paddingBottom: '0.5mm',
                                }}
                            >
                                {drinkWindow(wine)}
                            </div>
                        </div>
                    </div>
                    <div
                        className="mt-[1mm] leading-[1.25] font-semibold"
                        style={{ fontSize: '7pt' }}
                    >
                        <div className="truncate">{origin.join(' · ')}</div>
                        {wine.grapes.length > 0 && (
                            <div className="truncate">
                                {wine.grapes.join(', ')}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const TITLE_MIN_PT = 8;
const TITLE_MAX_PT = 30;

/**
 * Wine name set as large as the free space allows: short names get huge,
 * long ones wrap and shrink until they fit, never cutting a word.
 */
function FittedTitle({ text }: { text: string }) {
    const box = useRef<HTMLDivElement>(null);
    const title = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const container = box.current;
        const element = title.current;

        if (!container || !element) {
            return;
        }

        const fit = () => {
            if (container.clientHeight === 0) {
                return;
            }

            const fits = (size: number) => {
                element.style.fontSize = `${size}pt`;

                return (
                    element.scrollHeight <= container.clientHeight &&
                    element.scrollWidth <= container.clientWidth
                );
            };

            let low = TITLE_MIN_PT;
            let high = TITLE_MAX_PT;

            // Half-point precision is plenty on a 300 dpi label.
            while (high - low > 0.5) {
                const middle = (low + high) / 2;

                if (fits(middle)) {
                    low = middle;
                } else {
                    high = middle;
                }
            }

            element.style.fontSize = `${low}pt`;
        };

        fit();
        void document.fonts?.ready.then(fit);

        const observer = new ResizeObserver(fit);
        observer.observe(container);

        return () => observer.disconnect();
    }, [text]);

    return (
        <div
            ref={box}
            className="flex min-h-0 flex-1 items-center overflow-hidden"
        >
            <div
                ref={title}
                className="w-full leading-[1.05] font-extrabold tracking-tight break-normal hyphens-none"
                style={{ fontSize: `${TITLE_MIN_PT}pt` }}
            >
                {/* Never break « Lynch-Bages » or « Puligny-Montrachet ». */}
                {text.replace(/-/g, '\u2011')}
            </div>
        </div>
    );
}
