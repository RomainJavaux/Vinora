#!/usr/bin/env bash
#
# Atomic deployment on shared hosting (Hostinger). Run through SSH by the
# GitHub workflow:  ssh … "ACTION=deploy DEPLOY_PATH=… PUBLIC_HTML=… bash -s" < deploy/remote.sh
#
#   DEPLOY_PATH/
#     releases/<AAAAMMJJHHMMSS>-<sha7>/   one release per deployment (4 kept)
#     shared/.env                          production settings
#     shared/storage/                      uploads, sessions, logs, view caches
#     current -> releases/…                active release
#   PUBLIC_HTML -> DEPLOY_PATH/current/public
#
set -euo pipefail

ACTION="${ACTION:-deploy}"
PHP_BIN="${PHP_BIN:-php}"
KEEP=4

: "${DEPLOY_PATH:?DEPLOY_PATH manquant}"
: "${PUBLIC_HTML:?PUBLIC_HTML manquant}"

info() { printf '\033[1;35m▸ %s\033[0m\n' "$1"; }

php_ok=$("$PHP_BIN" -r 'echo version_compare(PHP_VERSION, "8.4.1", ">=") ? "1" : "0";')
if [ "$php_ok" != "1" ]; then
    echo "PHP 8.4.1 minimum est requis (trouvé : $("$PHP_BIN" -r 'echo PHP_VERSION;'))."
    echo "Sur Hostinger, la version web se règle par site dans hPanel ; en SSH, passe PHP_BIN=/opt/alt/php84/usr/bin/php."
    exit 1
fi

cd "$DEPLOY_PATH"
mkdir -p releases shared/storage/app/public shared/storage/framework/{cache,sessions,views} shared/storage/logs

optimize() {
    "$PHP_BIN" artisan optimize:clear > /dev/null
    "$PHP_BIN" artisan optimize
}

link_web_root() {
    if [ -e "$PUBLIC_HTML" ] && [ ! -L "$PUBLIC_HTML" ]; then
        backup="$DEPLOY_PATH/web-root-backup-$(date +%Y%m%d%H%M%S)"
        info "Le dossier web existant est mis de côté dans $backup"
        mv "$PUBLIC_HTML" "$backup"
    fi
    ln -sfn "$DEPLOY_PATH/current/public" "$PUBLIC_HTML.tmp"
    mv -T "$PUBLIC_HTML.tmp" "$PUBLIC_HTML"
}

if [ "$ACTION" = "rollback" ]; then
    previous=$(ls -1 releases | sort | tail -n 2 | head -n 1)
    active=$(basename "$(readlink current)")
    if [ -z "$previous" ] || [ "$previous" = "$active" ]; then
        echo "Aucune release précédente vers laquelle revenir."
        exit 1
    fi
    info "Retour à $previous"
    ln -sfn "releases/$previous" current.tmp && mv -T current.tmp current
    cd current && optimize
    info "Rollback terminé (les migrations ne sont pas annulées)."
    exit 0
fi

[ -f shared/.env ] || { echo "shared/.env est absent : ajoute le secret PRODUCTION_ENV ou crée le fichier."; exit 1; }
[ -n "${RELEASE:-}" ] || RELEASE="$(date +%Y%m%d%H%M%S)"

info "Décompression de la release $RELEASE"
mkdir -p "releases/$RELEASE"
tar -xzf release.tar.gz -C "releases/$RELEASE"
rm -f release.tar.gz

cd "releases/$RELEASE"
ln -sfn "$DEPLOY_PATH/shared/.env" .env
rm -rf storage
ln -sfn "$DEPLOY_PATH/shared/storage" storage
mkdir -p bootstrap/cache
ln -sfn ../storage/app/public public/storage

info "Migrations"
"$PHP_BIN" artisan migrate --force

info "Optimisation"
optimize

cd "$DEPLOY_PATH"
info "Bascule atomique"
ln -sfn "releases/$RELEASE" current.tmp && mv -T current.tmp current
link_web_root

"$PHP_BIN" current/artisan queue:restart > /dev/null 2>&1 || true

info "Nettoyage des anciennes releases"
ls -1 releases | sort | head -n -"$KEEP" | while read -r old; do rm -rf "releases/$old"; done

info "Déployé 🍷"
