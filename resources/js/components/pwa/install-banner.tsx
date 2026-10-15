import { Smartphone, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    isIos,
    isStandalone,
    promptInstall,
    readFlag,
    useInstallPrompt,
    writeFlag,
} from '@/lib/pwa';

const KEY = 'vinora.install-dismissed';

export function InstallBanner() {
    const prompt = useInstallPrompt();
    const [dismissed, setDismissed] = useState(() => readFlag(KEY));
    const ios = isIos();

    if (dismissed || isStandalone() || (!prompt && !ios)) {
        return null;
    }

    const close = () => {
        writeFlag(KEY);
        setDismissed(true);
    };

    return (
        <div className="bg-brand relative flex items-center gap-4 overflow-hidden rounded-3xl p-4 text-white shadow-float">
            <div className="hero-veil absolute inset-0" />
            <motion.span
                className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/20"
                animate={{ rotate: [0, -10, 10, -6, 0] }}
                transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    repeatDelay: 2.5,
                }}
            >
                <Smartphone className="size-6" />
            </motion.span>
            <div className="relative min-w-0 flex-1">
                <p className="font-display font-extrabold">
                    Installe Vinora sur ton téléphone
                </p>
                <p className="text-[13px] text-white/85">
                    {prompt
                        ? 'Un accès en un geste, même devant la cave.'
                        : 'Touche ⎋ puis « Sur l’écran d’accueil ».'}
                </p>
            </div>
            {prompt && (
                <Button
                    size="sm"
                    variant="secondary"
                    className="relative bg-white text-[#9f1239] hover:bg-white/90"
                    onClick={() => void promptInstall()}
                >
                    Installer
                </Button>
            )}
            <button
                type="button"
                onClick={close}
                className="relative flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-white/15"
                aria-label="Masquer"
            >
                <X className="size-4" />
            </button>
        </div>
    );
}
