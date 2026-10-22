import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Fingerprint,
    PencilRuler,
    UserPlus,
    Wine,
} from 'lucide-react';
import { motion } from 'motion/react';
import AppLogo from '@/components/app-logo';
import { CellarVisual } from '@/components/cellar/cellar-visual';
import { Aurora, Bubbles } from '@/components/fx/aurora';
import { Button } from '@/components/ui/button';
import { BottleArt } from '@/components/wines/wine-visuals';
import { login, register } from '@/routes';
import type { CategoryValue } from '@/types/models';

const features = [
    {
        emoji: '🗄️',
        title: 'Ta cave, dessinée',
        text: 'Armoire de garde, cave de service, casier ou cave voûtée : touche une clayette, elle s’ouvre et montre ses bouteilles.',
    },
    {
        emoji: '⏳',
        title: 'L’apogée, calculée',
        text: 'Une fenêtre de garde selon la couleur et le millésime : on te dit quoi ouvrir maintenant, et ce qui doit encore attendre.',
    },
    {
        emoji: '🍽️',
        title: 'Quelle bouteille ce soir ?',
        text: 'Dis ce que tu manges : on tire au sort la bouteille idéale, en priorité celles qui sont à leur apogée.',
    },
    {
        emoji: '📓',
        title: 'Carnet de dégustation',
        text: 'Des étoiles et un mot à chaque bouteille ouverte. Tes coups de cœur, prêts à être rachetés.',
    },
    {
        emoji: '👨‍👩‍👧',
        title: 'En famille',
        text: 'Un lieu partagé, des invitations par lien ou QR code. Chacun voit ce qu’il reste, et qui a ouvert le Margaux.',
    },
    {
        emoji: '📷',
        title: 'Rangée en 15 secondes',
        text: 'Photo de l’étiquette, suggestions « déjà dans ta cave », millésime en un geste. Et l’étiquette QR à imprimer.',
    },
];

const demo: {
    name: string;
    units: number;
    capacity: number;
    bottles: CategoryValue[];
}[] = [
    {
        name: 'Grands bordeaux',
        units: 7,
        capacity: 8,
        bottles: ['red', 'red', 'red', 'red', 'red', 'red', 'red'],
    },
    {
        name: 'Bourgognes',
        units: 5,
        capacity: 8,
        bottles: ['red', 'red', 'red', 'white', 'white'],
    },
    {
        name: 'Rhône & Sud',
        units: 6,
        capacity: 8,
        bottles: ['red', 'red', 'red', 'rose', 'red', 'red'],
    },
    {
        name: 'Blancs',
        units: 4,
        capacity: 8,
        bottles: ['white', 'white', 'orange', 'sweet'],
    },
    {
        name: 'Bulles',
        units: 6,
        capacity: 8,
        bottles: [
            'sparkling',
            'sparkling',
            'sparkling',
            'sparkling',
            'rose',
            'sparkling',
        ],
    },
];

export default function Welcome() {
    return (
        <div className="relative min-h-dvh overflow-x-clip">
            <Head title="Ta cave à vin, à son apogée" />
            <Aurora />

            <header className="pt-safe mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
                <AppLogo />
                <nav className="flex items-center gap-2">
                    <Button asChild variant="ghost">
                        <Link href={login()}>Se connecter</Link>
                    </Button>
                    <Button asChild className="hidden sm:inline-flex">
                        <Link href={register()}>Créer un compte</Link>
                    </Button>
                </nav>
            </header>

            <main>
                <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 pt-6 pb-20 sm:px-8 lg:grid-cols-2 lg:pt-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            type: 'spring',
                            stiffness: 200,
                            damping: 24,
                        }}
                    >
                        <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold">
                            ✨ Cave · Apogée · En famille
                        </span>
                        <h1 className="mt-6 font-display text-[52px] leading-[0.95] font-extrabold tracking-tight sm:text-7xl">
                            Ta cave,
                            <br />
                            <span className="text-gradient-brand">
                                à son apogée.
                            </span>
                        </h1>
                        <p className="mt-6 max-w-lg text-lg text-muted-foreground">
                            Vinora te montre chaque bouteille, clayette par
                            clayette, te dit lesquelles ouvrir maintenant et
                            partage tout ça avec ceux qui boivent avec toi. Fini
                            les grands crus oubliés qui passent leur heure.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Button asChild variant="warm" size="lg">
                                <Link href={register()}>
                                    Commencer gratuitement
                                    <ArrowRight />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="lg">
                                <Link href={login()}>
                                    <Fingerprint />
                                    J’ai déjà un compte
                                </Link>
                            </Button>
                        </div>
                    </motion.div>

                    <div className="relative flex justify-center py-6">
                        <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,rgb(225_29_72/0.25),transparent_65%)]" />
                        <CellarVisual
                            type="cabinet"
                            color="bordeaux"
                            name="Cave du salon"
                            size="lg"
                            animateOpening
                            selectedId={0}
                            temperature={12}
                            compartments={demo.map((row, index) => ({
                                id: index,
                                name: row.name,
                                units: row.units,
                                capacity: row.capacity,
                                previewBottles: row.bottles,
                                urgentCount: index === 2 ? 1 : 0,
                            }))}
                        />
                        <motion.div
                            className="glass-strong absolute top-[12%] -left-1 flex items-center gap-2 rounded-2xl px-3 py-2 shadow-float sm:left-0"
                            animate={{ y: [0, -8, 0] }}
                            transition={{
                                duration: 4,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                        >
                            <BottleArt
                                category="red"
                                region="Bordeaux"
                                className="h-9"
                            />
                            <span className="text-[13px] font-bold">
                                Pichon Baron 2016 ×4
                                <span className="block text-[11px] font-semibold text-muted-foreground">
                                    Grands bordeaux
                                </span>
                            </span>
                        </motion.div>
                        <motion.div
                            className="glass-strong absolute right-0 bottom-[14%] flex items-center gap-2 rounded-2xl px-3 py-2.5 shadow-float"
                            animate={{ y: [0, 8, 0] }}
                            transition={{
                                duration: 4.6,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: 0.6,
                            }}
                        >
                            <span className="relative flex size-2">
                                <span className="animate-pulse-dot absolute inset-0 rounded-full bg-soon" />
                                <span className="relative size-2 rounded-full bg-soon" />
                            </span>
                            <span className="text-[13px] font-bold">
                                Morgon 2023 : à boire cette année
                            </span>
                        </motion.div>
                    </div>
                </section>

                <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {features.map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                className="glass rounded-3xl p-6"
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-60px' }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 220,
                                    damping: 24,
                                    delay: (index % 3) * 0.08,
                                }}
                                whileHover={{ y: -4 }}
                            >
                                <span className="text-4xl">
                                    {feature.emoji}
                                </span>
                                <h2 className="mt-4 font-display text-xl font-extrabold">
                                    {feature.title}
                                </h2>
                                <p className="mt-2 text-[15px] text-muted-foreground">
                                    {feature.text}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
                    <div className="bg-brand relative overflow-hidden rounded-[36px] px-6 py-12 text-white shadow-float sm:px-12">
                        <div className="hero-veil absolute inset-0" />
                        <Bubbles count={22} seed={11} />
                        <div className="relative">
                            <h2 className="font-display text-4xl font-extrabold tracking-tight">
                                Prête en 2 minutes
                            </h2>
                            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
                                {[
                                    {
                                        icon: UserPlus,
                                        title: 'Crée ton compte',
                                        text: 'Reste connecté, ou passe à Face ID.',
                                    },
                                    {
                                        icon: PencilRuler,
                                        title: 'Dessine ta cave',
                                        text: 'Type, clayettes, places : c’est elle.',
                                    },
                                    {
                                        icon: Wine,
                                        title: 'Range tes bouteilles',
                                        text: 'Et laisse-nous veiller sur l’apogée.',
                                    },
                                ].map((step, index) => (
                                    <div
                                        key={step.title}
                                        className="flex gap-4"
                                    >
                                        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                                            <step.icon className="size-6" />
                                        </span>
                                        <div>
                                            <p className="text-[12px] font-bold tracking-wider text-white/70 uppercase">
                                                Étape {index + 1}
                                            </p>
                                            <p className="font-display text-lg font-bold">
                                                {step.title}
                                            </p>
                                            <p className="text-sm text-white/80">
                                                {step.text}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Button
                                asChild
                                size="lg"
                                variant="secondary"
                                className="mt-10 bg-white text-[#9f1239] hover:bg-white/90"
                            >
                                <Link href={register()}>
                                    Je range ma première bouteille
                                    <ArrowRight />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="pb-safe mx-auto max-w-6xl px-5 pt-2 pb-10 text-center text-sm text-muted-foreground sm:px-8">
                🍷 Vinora — garde le vin, pas le désordre.
            </footer>
        </div>
    );
}
