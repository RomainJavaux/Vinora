import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import AppLogo from '@/components/app-logo';
import { CellarVisual } from '@/components/cellar/cellar-visual';
import { Aurora, Bubbles } from '@/components/fx/aurora';
import { home } from '@/routes';
import type { CategoryValue } from '@/types/models';

const demo: {
    name: string;
    units: number;
    capacity: number;
    bottles: CategoryValue[];
}[] = [
    {
        name: 'Grands bordeaux',
        units: 6,
        capacity: 8,
        bottles: ['red', 'red', 'red', 'red', 'red', 'red'],
    },
    {
        name: 'Bourgognes',
        units: 5,
        capacity: 8,
        bottles: ['red', 'red', 'white', 'white', 'red'],
    },
    {
        name: 'Blancs',
        units: 7,
        capacity: 8,
        bottles: [
            'white',
            'white',
            'white',
            'orange',
            'white',
            'sweet',
            'white',
        ],
    },
    {
        name: 'Bulles',
        units: 4,
        capacity: 8,
        bottles: ['sparkling', 'sparkling', 'sparkling', 'rose'],
    },
    { name: 'Magnums', units: 2, capacity: 4, bottles: ['red', 'red'] },
];

export default function AuthLayout({
    children,
    title,
    description,
}: {
    children: ReactNode;
    title?: string;
    description?: string;
}) {
    return (
        <div className="relative grid min-h-dvh grid-cols-1 lg:grid-cols-2">
            <Aurora />

            <div className="bg-brand relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex">
                <div className="hero-veil absolute inset-0" />
                <Bubbles count={20} seed={3} />
                <Link href={home()} className="relative">
                    <AppLogo light />
                </Link>

                <div className="relative flex justify-center py-8">
                    <CellarVisual
                        type="cabinet"
                        color="gold"
                        name="Cave du salon"
                        size="md"
                        animateOpening
                        selectedId={2}
                        temperature={12}
                        compartments={demo.map((row, index) => ({
                            id: index,
                            name: row.name,
                            units: row.units,
                            capacity: row.capacity,
                            previewBottles: row.bottles,
                            urgentCount: index === 1 ? 1 : 0,
                        }))}
                    />
                </div>

                <blockquote className="relative max-w-md">
                    <p className="font-display text-2xl leading-snug font-bold">
                        « Le vendredi soir, on sait exactement quelle bouteille
                        ouvrir — et on n’oublie plus celles qui attendent leur
                        heure. »
                    </p>
                    <footer className="mt-3 text-sm text-white/75">
                        Camille, Bordeaux
                    </footer>
                </blockquote>
            </div>

            <div className="flex flex-col items-center justify-center px-5 py-10 sm:px-8">
                <div className="w-full max-w-[400px]">
                    <Link
                        href={home()}
                        className="mb-8 flex justify-center lg:hidden"
                    >
                        <AppLogo size="lg" />
                    </Link>
                    {(title || description) && (
                        <div className="mb-7 text-center lg:text-left">
                            {title && (
                                <h1 className="font-display text-3xl font-extrabold tracking-tight">
                                    {title}
                                </h1>
                            )}
                            {description && (
                                <p className="mt-2 text-[15px] text-muted-foreground">
                                    {description}
                                </p>
                            )}
                        </div>
                    )}
                    {children}
                </div>
            </div>
        </div>
    );
}
