import { Head } from '@inertiajs/react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

const options: {
    value: Appearance;
    label: string;
    icon: typeof Sun;
    preview: string;
}[] = [
    { value: 'light', label: 'Clair', icon: Sun, preview: 'bg-[#faf7f1]' },
    { value: 'dark', label: 'Sombre', icon: Moon, preview: 'bg-[#1c1012]' },
    {
        value: 'system',
        label: 'Comme mon appareil',
        icon: Monitor,
        preview: 'bg-[linear-gradient(135deg,#faf7f1_50%,#1c1012_50%)]',
    },
];

export default function AppearancePage() {
    const { appearance, updateAppearance } = useAppearance();

    return (
        <>
            <Head title="Apparence" />

            <section className="surface p-6">
                <h2 className="font-display text-lg font-bold">Apparence</h2>
                <p className="mt-1 mb-5 text-sm text-muted-foreground">
                    Le mode sombre « nuit de cave » est parfait le soir, devant
                    les bouteilles.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {options.map((option) => {
                        const active = appearance === option.value;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                aria-pressed={active}
                                onClick={() => updateAppearance(option.value)}
                                className={cn(
                                    'relative overflow-hidden rounded-3xl border p-3 text-left transition-transform active:scale-[0.98]',
                                    active
                                        ? 'border-primary ring-2 ring-primary'
                                        : 'border-border hover:border-foreground/25',
                                )}
                            >
                                <div
                                    className={cn(
                                        'relative h-24 overflow-hidden rounded-2xl',
                                        option.preview,
                                    )}
                                >
                                    <div className="absolute top-3 left-3 h-2 w-16 rounded-full bg-[#9f1239]" />
                                    <div className="absolute top-7 left-3 h-2 w-24 rounded-full bg-[#ca8a04]/70" />
                                    <div className="absolute right-3 bottom-3 left-3 h-8 rounded-xl border border-black/5 bg-white/40" />
                                </div>
                                <div className="mt-3 flex items-center gap-2 font-semibold">
                                    <option.icon className="size-4" />
                                    {option.label}
                                    {active && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="ml-auto text-primary"
                                        >
                                            <Check className="size-4" />
                                        </motion.span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </section>
        </>
    );
}
