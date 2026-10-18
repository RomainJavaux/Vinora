# Déployer Vinora

Cible : hébergement mutualisé **Hostinger** (PHP, MySQL, SSH, sans Node ni worker), déploiement continu depuis GitHub.

## Comment ça marche

- `.github/workflows/tests.yml` : sur chaque pull request et chaque push hors `main` (et appelé par le déploiement).
- `.github/workflows/deploy.yml` : sur push vers `main`, ou à la main avec `action = deploy | rollback`.
    1. lance les tests (sauf rollback) ;
    2. vérifie la configuration ;
    3. construit la release (`composer install --no-dev`, `npm ci && npm run build`) : le serveur n’a besoin ni de Composer ni de Node ;
    4. envoie le `.env` de production (si le secret existe), puis l’archive ;
    5. exécute `deploy/remote.sh` sur le serveur ;
    6. vérifie `GET {APP_URL}/up` (5 tentatives).

`deploy/remote.sh` déploie de façon atomique :

```
DEPLOY_PATH/
  releases/<AAAAMMJJHHMMSS>-<sha7>/   une release par déploiement (4 gardées)
  shared/.env                          réglages de production
  shared/storage/                      photos, sessions, logs, caches
  current -> releases/…                release active
PUBLIC_HTML -> DEPLOY_PATH/current/public
```

Rollback : relance le workflow avec `action = rollback` (le lien `current` repointe sur la release précédente ; les migrations ne sont pas annulées).

## Réglages GitHub

**Secrets** (environnement `production`) :

| Nom                     | Contenu                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| `HOSTINGER_SSH_HOST`    | hôte SSH                                                                 |
| `HOSTINGER_SSH_USER`    | utilisateur SSH                                                          |
| `HOSTINGER_SSH_KEY`     | clé privée de déploiement                                                |
| `HOSTINGER_DEPLOY_PATH` | ex. `/home/u123/domains/vinora.example.com/vinora`                       |
| `HOSTINGER_PUBLIC_HTML` | ex. `/home/u123/domains/vinora.example.com/public_html`                  |
| `PRODUCTION_ENV`        | contenu complet du `.env` de production (voir `.env.production.example`) |
| `HOSTINGER_KNOWN_HOSTS` | facultatif : empreinte du serveur                                        |

**Variables** : `HOSTINGER_SSH_PORT` (65002), `APP_URL`, `HOSTINGER_PHP_BIN` (facultatif).

Sur un dépôt public, les variables apparaissent en clair dans les logs : garde les chemins serveur en **secrets**.

## Pièges connus

- **La version PHP du site ≠ celle de la ligne de commande** sur Hostinger : la version web se règle par site dans hPanel. Un sous-domaine qui pointe vers le dossier d’un autre site hérite de sa version PHP. Il faut **PHP ≥ 8.4.1** (Symfony 8).
- **Ne pointe jamais `HOSTINGER_PUBLIC_HTML` sur la racine d’un site existant** : le script remplace ce dossier par un lien (l’ancien contenu est mis de côté dans `DEPLOY_PATH/web-root-backup-…`).
- Les passkeys sont liées au domaine de `APP_URL` : changer de domaine invalide les passkeys existantes.
- La file d’attente est `sync` (pas de worker) : les e-mails d’invitation partent immédiatement ; un échec d’envoi n’empêche pas la création du lien.
- **Ne change jamais `APP_KEY` en production** : il chiffre les clés Anthropic que chaque personne enregistre pour la lecture d’étiquette. Avec une autre `APP_KEY`, ces clés deviennent illisibles (la lecture se désactive et chacun doit recoller sa clé). Pour une rotation, garde l’ancienne dans `APP_PREVIOUS_KEYS`.
- **Lecture d’étiquette** : le serveur n’a aucune clé d’IA. Chaque utilisateur colle la sienne dans Réglages → Lecture d’étiquette ; elle est vérifiée auprès d’Anthropic, chiffrée en base et utilisée uniquement pour ses propres photos (30 lectures par heure au maximum). Le serveur doit pouvoir joindre `https://api.anthropic.com` en sortie.
