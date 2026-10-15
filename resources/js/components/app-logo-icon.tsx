import type { SVGAttributes } from 'react';

/**
 * Vinora's symbol: a wine glass in a rounded bordeaux tile with a golden
 * reflection.
 */
export default function AppLogoIcon({
    plain = false,
    ...props
}: SVGAttributes<SVGElement> & { plain?: boolean }) {
    return (
        <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            {!plain && (
                <>
                    <defs>
                        <linearGradient
                            id="vinora-tile"
                            x1="0"
                            y1="0"
                            x2="64"
                            y2="64"
                            gradientUnits="userSpaceOnUse"
                        >
                            <stop offset="0" stopColor="#F43F5E" />
                            <stop offset="0.55" stopColor="#9F1239" />
                            <stop offset="1" stopColor="#581C87" />
                        </linearGradient>
                        <linearGradient
                            id="vinora-shine"
                            x1="32"
                            y1="0"
                            x2="32"
                            y2="32"
                            gradientUnits="userSpaceOnUse"
                        >
                            <stop
                                offset="0"
                                stopColor="#FFFFFF"
                                stopOpacity="0.32"
                            />
                            <stop
                                offset="1"
                                stopColor="#FFFFFF"
                                stopOpacity="0"
                            />
                        </linearGradient>
                    </defs>
                    <rect
                        width="64"
                        height="64"
                        rx="18"
                        fill="url(#vinora-tile)"
                    />
                    <rect
                        width="64"
                        height="32"
                        rx="18"
                        fill="url(#vinora-shine)"
                    />
                </>
            )}
            <path
                d="M21 14h22c1 7.5-.6 13.7-4.1 17.2A9.6 9.6 0 0 1 32 34a9.6 9.6 0 0 1-6.9-2.8C21.6 27.7 20 21.5 21 14Z"
                stroke={plain ? 'currentColor' : '#fff'}
                strokeWidth="4"
                strokeLinejoin="round"
            />
            <path
                d="M22.6 22.5h18.8c-.5 3.3-1.6 5.8-3.3 7.5A8.4 8.4 0 0 1 32 32.4a8.4 8.4 0 0 1-6.1-2.4c-1.7-1.7-2.8-4.2-3.3-7.5Z"
                fill={plain ? 'currentColor' : '#FDE68A'}
            />
            <path
                d="M32 34v14M24 50h16"
                stroke={plain ? 'currentColor' : '#fff'}
                strokeWidth="4"
                strokeLinecap="round"
            />
        </svg>
    );
}
