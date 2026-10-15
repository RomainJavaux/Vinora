<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="theme-color" content="#faf7f1" media="(prefers-color-scheme: light)">
        <meta name="theme-color" content="#1c1012" media="(prefers-color-scheme: dark)">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="default">
        <meta name="apple-mobile-web-app-title" content="{{ config('app.name', 'Vinora') }}">
        <meta name="application-name" content="{{ config('app.name', 'Vinora') }}">
        <meta name="format-detection" content="telephone=no">
        <meta name="description" content="Vinora : ta cave à vin, bouteille par bouteille. Ce qu’il y a sur chaque clayette, quoi ouvrir maintenant, partagé avec ceux qui boivent avec toi.">

        {{-- Apply dark mode before the first paint --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                }
            })();
        </script>

        <style>
            html {
                background-color: #faf7f1;
            }

            html.dark {
                background-color: #1c1012;
            }
        </style>

        <link rel="manifest" href="/manifest.webmanifest">
        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ config('app.name', 'Vinora') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
