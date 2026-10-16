import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import AppLogo from '@/components/app-logo';
import {
    CellarConfigurator,
    defaultCompartments,
    toPayload,
} from '@/components/cellar/cellar-configurator';
import type { ConfiguratorValue } from '@/components/cellar/cellar-configurator';
import { CellarVisual } from '@/components/cellar/cellar-visual';
import { Aurora, Bubbles } from '@/components/fx/aurora';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ColorSwatches, EmojiGrid } from '@/components/ui/pickers';
import { findCellarType, findColor, gradient, useCatalog } from '@/lib/catalog';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import onboardingRoutes from '@/routes/onboarding';
import type { PaletteKey } from '@/types/models';

const slide = {
    enter: (direction: number) => ({ x: direction * 60, opacity: 0 }),
    center: { x: 0, opacity: 1, transitionEnd: { transform: 'none' } },
    exit: (direction: number) => ({ x: direction * -60, opacity: 0 }),
};

export default function Onboarding({
    isAdditional,
}: {
    isAdditional: boolean;
}) {
    const { auth } = usePage().props;
    const catalog = useCatalog();
    const [step, setStep] = useState(isAdditional ? 1 : 0);
    const [direction, setDirection] = useState(1);
    const [name, setName] = useState(isAdditional ? '' : 'Ma maison');
    const [emoji, setEmoji] = useState(isAdditional ? '🏡' : '🏠');
    const [color, setColor] = useState<PaletteKey>('bordeaux');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [cellar, setCellar] = useState<ConfiguratorValue>(() => {
        const type = findCellarType(catalog, 'cabinet');

        return {
            name: 'Cave du salon',
            type: 'cabinet',
            color: 'bordeaux',
            location: 'Salon',
            notes: '',
            temperature: '',
            humidity: '',
            depth: 1,
            compartments: defaultCompartments(
                type.compartment,
                type.defaultCount,
                type.defaultCapacity,
            ),
        };
    });

    const go = (next: number) => {
        setDirection(next > step ? 1 : -1);
        setStep(next);
        window.scrollTo({ top: 0 });
    };

    const submit = (withCellar: boolean) => {
        router.post(
            onboardingRoutes.store.url(),
            {
                household: { name: name.trim(), emoji, color },
                ...(withCellar
                    ? {
                          cellar: toPayload({
                              ...cellar,
                              name:
                                  cellar.name.trim() ||
                                  findCellarType(catalog, cellar.type).label,
                          }),
                      }
                    : {}),
            },
            {
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onError: (next) => {
                    setErrors(next);

                    if (
                        Object.keys(next).some((key) =>
                            key.startsWith('household'),
                        )
                    ) {
                        go(1);
                    }
                },
            },
        );
    };

    const firstName = auth.user?.name.split(' ')[0] ?? '';

    return (
        <div className="relative min-h-dvh">
            <Head title="Bienvenue" />
            <Aurora />

            <header className="pt-safe mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5">
                <AppLogo />
                <div
                    className="flex items-center gap-1.5"
                    aria-label={`Étape ${step + 1} sur 3`}
                >
                    {[0, 1, 2].map((index) => (
                        <motion.span
                            key={index}
                            className={cn(
                                'h-2 rounded-full',
                                index <= step
                                    ? 'bg-primary'
                                    : 'bg-foreground/15',
                            )}
                            animate={{ width: index === step ? 28 : 8 }}
                            transition={{
                                type: 'spring',
                                stiffness: 400,
                                damping: 30,
                            }}
                        />
                    ))}
                </div>
                {isAdditional ? (
                    <Button asChild variant="ghost" size="sm">
                        <Link href={dashboard()}>Annuler</Link>
                    </Button>
                ) : (
                    <span className="w-16" />
                )}
            </header>

            <main
                className={cn(
                    'mx-auto px-5 pb-36',
                    step === 2 ? 'max-w-5xl' : 'max-w-xl',
                )}
            >
                <AnimatePresence mode="wait" custom={direction} initial={false}>
                    <motion.div
                        key={step}
                        custom={direction}
                        variants={slide}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            type: 'spring',
                            stiffness: 320,
                            damping: 32,
                        }}
                    >
                        {step === 0 && (
                            <div className="flex flex-col items-center pt-6 text-center">
                                <CellarVisual
                                    type="cabinet"
                                    color="gold"
                                    name="Ta cave"
                                    size="md"
                                    animateOpening
                                    temperature={12}
                                    compartments={[
                                        {
                                            id: 1,
                                            name: 'Rouges',
                                            units: 6,
                                            capacity: 8,
                                            previewBottles: [
                                                'red',
                                                'red',
                                                'red',
                                                'red',
                                                'red',
                                                'red',
                                            ],
                                        },
                                        {
                                            id: 2,
                                            name: 'Blancs',
                                            units: 4,
                                            capacity: 8,
                                            previewBottles: [
                                                'white',
                                                'white',
                                                'white',
                                                'sweet',
                                            ],
                                        },
                                        {
                                            id: 3,
                                            name: 'Bulles',
                                            units: 5,
                                            capacity: 8,
                                            previewBottles: [
                                                'sparkling',
                                                'sparkling',
                                                'sparkling',
                                                'rose',
                                                'rose',
                                            ],
                                        },
                                    ]}
                                />
                                <motion.span
                                    className="mt-8 text-5xl"
                                    animate={{
                                        rotate: [0, 18, -8, 16, -4, 10, 0],
                                    }}
                                    transition={{
                                        duration: 1.6,
                                        delay: 0.6,
                                        repeat: 1,
                                        repeatDelay: 1,
                                    }}
                                >
                                    👋
                                </motion.span>
                                <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight">
                                    Bienvenue, {firstName} !
                                </h1>
                                <p className="mt-3 max-w-md text-[16px] text-muted-foreground">
                                    On va dessiner ta cave en deux minutes : ton
                                    lieu, puis ta première cave avec ses
                                    clayettes. Ensuite, chaque bouteille aura sa
                                    place, et on te dira quand l’ouvrir.
                                </p>
                                <Button
                                    size="lg"
                                    className="mt-8"
                                    onClick={() => go(1)}
                                >
                                    C’est parti
                                    <ArrowRight />
                                </Button>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="pt-4">
                                <h1 className="font-display text-3xl font-extrabold tracking-tight">
                                    Comment s’appelle ton lieu ?
                                </h1>
                                <p className="mt-2 text-muted-foreground">
                                    La maison, l’appartement, la maison de
                                    famille… Tu pourras en créer d’autres.
                                </p>

                                <div
                                    className="relative mt-6 overflow-hidden rounded-[32px] p-6 text-white shadow-float"
                                    style={{
                                        background: gradient(
                                            findColor(catalog, color),
                                        ),
                                    }}
                                >
                                    <div className="hero-veil absolute inset-0" />
                                    <Bubbles count={12} seed={5} />
                                    <div className="relative flex items-center gap-4">
                                        <motion.span
                                            key={emoji}
                                            initial={{
                                                scale: 0.4,
                                                rotate: -20,
                                            }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{
                                                type: 'spring',
                                                stiffness: 500,
                                                damping: 14,
                                            }}
                                            className="flex size-16 items-center justify-center rounded-3xl border border-white/30 bg-white/20 text-4xl backdrop-blur"
                                        >
                                            {emoji}
                                        </motion.span>
                                        <div className="min-w-0">
                                            <p className="text-[12px] font-bold tracking-wide text-white/80 uppercase">
                                                Lieu
                                            </p>
                                            <p className="truncate font-display text-2xl font-extrabold">
                                                {name || 'Ton lieu'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 space-y-6">
                                    <div>
                                        <Input
                                            value={name}
                                            onChange={(event) =>
                                                setName(event.target.value)
                                            }
                                            placeholder="Ma maison"
                                            className="h-14 font-display text-xl font-bold"
                                            maxLength={60}
                                            autoFocus
                                            aria-label="Nom du lieu"
                                        />
                                        <InputError
                                            message={errors['household.name']}
                                            className="mt-2"
                                        />
                                    </div>
                                    <EmojiGrid
                                        emojis={catalog.householdEmojis}
                                        value={emoji}
                                        onChange={setEmoji}
                                    />
                                    <ColorSwatches
                                        options={catalog.palette}
                                        value={color}
                                        onChange={setColor}
                                    />
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="pt-4">
                                <h1 className="font-display text-3xl font-extrabold tracking-tight">
                                    Ta première cave
                                </h1>
                                <p className="mt-2 mb-6 text-muted-foreground">
                                    Dessine-la telle qu’elle est : on la
                                    retrouvera partout dans l’app.
                                </p>
                                <CellarConfigurator
                                    value={cellar}
                                    onChange={setCellar}
                                    errors={errors}
                                    errorPrefix="cellar."
                                />
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>

            {step > 0 && (
                <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-background/85 pt-3 backdrop-blur-xl">
                    <div
                        className={cn(
                            'mx-auto flex items-center gap-2 px-5',
                            step === 2 ? 'max-w-5xl' : 'max-w-xl',
                        )}
                    >
                        {(!isAdditional || step > 1) && (
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => go(step - 1)}
                                aria-label="Retour"
                            >
                                <ArrowLeft />
                            </Button>
                        )}
                        {step === 1 ? (
                            <Button
                                size="lg"
                                className="flex-1"
                                disabled={!name.trim()}
                                onClick={() => go(2)}
                            >
                                Continuer
                                <ArrowRight />
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="ghost"
                                    className="min-w-0 flex-1 sm:flex-none"
                                    disabled={processing}
                                    onClick={() => submit(false)}
                                >
                                    <span className="truncate">Plus tard</span>
                                </Button>
                                <Button
                                    variant="warm"
                                    size="lg"
                                    className="min-w-0 flex-1"
                                    disabled={processing}
                                    onClick={() => submit(true)}
                                >
                                    ✨ Tout est prêt !
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
