# 🍷 Vinora

> **Ta cave, à son apogée.**
> Vinora te montre chaque bouteille, clayette par clayette, te dit lesquelles ouvrir maintenant et partage tout ça avec ceux qui boivent avec toi.

Application web installable (PWA), mobile d’abord, construite sur le même socle que Froova (voir `docs/` du projet Froova) et transposée au vin.

## Ce que fait l’app

- **Caves dessinées et interactives** : armoire de garde, cave de service, casier mural ou cave voûtée. Chaque clayette / rangée / casier montre ses bouteilles, colorées selon le vin, et ses places libres. On touche une clayette, elle s’ouvre.
- **Fenêtre d’apogée** : à partir de la couleur, du millésime et du potentiel de garde (jeune, moyenne, longue, très longue), Vinora calcule « à boire de … à … ». Quatre statuts : _trop jeune_ (bleu), _à boire_ (vert), _dernière année_ (ambre), _passé_ (rouge), avec anneau et frise de garde.
- **À boire maintenant** et **« Quelle bouteille ce soir ? »** : tirage pondéré vers les vins en fin de fenêtre, filtré par plat (accords mets-vins).
- **Boire, offrir, rajouter, déplacer (même quelques bouteilles), jeter** (bouchonné, oxydé, cassé) : tout passe par un service de stock unique et un journal des mouvements.
- **Carnet de dégustation** : note sur 5 et commentaire à chaque bouteille ouverte ; les coups de cœur se rachètent en un geste.
- **Ranger en 15 secondes** : photo de l’étiquette (compressée dans le navigateur puis réencodée en WebP), suggestions « Déjà dans ta cave » (même cuvée, autre millésime), quantités rapides (carton de 6, caisse de 12), formats (demi, clavelin, magnum, jéroboam…), emplacement choisi sur le dessin.
- **Valeur de la cave** (prix d’achat, valeur estimée), visible par tous ou seulement par les admins.
- **Export et import Excel** : toutes les données de chaque vin (un lot par ligne), l’historique complet et des listes déroulantes ; on modifie le fichier, on le redépose, un aperçu montre les ajouts, modifications et erreurs ligne par ligne avant de confirmer.
- **En famille** : lieux partagés, rôles (propriétaire, admin, membre), invitations par lien, e-mail ou QR code.
- **Connexion express** (passkeys), « rester connecté » par défaut, mode sombre « nuit de cave », PWA hors ligne.

## Démarrer

Prérequis : PHP ≥ 8.4.1 (extension `gd`), Composer, Node 22.

```bash
composer setup
php artisan migrate:fresh --seed
composer dev
```

Compte de démonstration : `test@example.com` / `password` (Camille : `camille@example.com` / `password`).

> Le projet est dans un dossier Dropbox : `vendor`, `node_modules`, `public/build` et `storage/framework` sont exclus de la synchronisation. En cas d’erreur `EBUSY` pendant un build, relance simplement la commande.

## Qualité

```bash
composer ci:check
```

Formatage et lint du front (Vite+), TypeScript, Pint, PHPStan (niveau 7) et la suite PHPUnit.

## Icônes

Toutes les icônes PWA sont générées depuis `resources/icons/logo.svg` :

```bash
node scripts/generate-icons.mjs
```

## Déploiement

Voir [DEPLOY.md](DEPLOY.md).
