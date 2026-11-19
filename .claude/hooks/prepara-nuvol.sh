#!/bin/bash
# Hook SessionStart: prepara les sessions de Claude Code al núvol.
#
# En local surt de seguida: allà les dependències viuen dins dels contenidors
# Docker (node_modules muntat) i no s'han d'instal·lar a l'amfitrió.
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

# Node 24: l'instal·la a /opt/node24 l'script de preparació de l'entorn del núvol
# (la VM porta el 22 i el projecte en demana >= 24, com el CI). CLAUDE_ENV_FILE fa
# que les ordres que Claude executi després també el trobin primer al PATH.
if [ -x /opt/node24/bin/node ]; then
  export PATH="/opt/node24/bin:$PATH"
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    echo 'export PATH="/opt/node24/bin:$PATH"' >>"$CLAUDE_ENV_FILE"
  fi
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

# Dependències: només es tornen a instal·lar si ha canviat algun d'aquests fitxers
# des de l'última instal·lació bona (l'empremta es desa dins de node_modules).
empremta=node_modules/.prepara-nuvol.sha256
fitxers=(.claude/hooks/prepara-nuvol.sh package-lock.json package.json frontend/package.json backend/package.json)
registre=/tmp/prepara-nuvol-npm.log

if ! sha256sum --check --status "$empremta" 2>/dev/null; then
  rm -f "$empremta"
  if npm ci --no-audit --no-fund >"$registre" 2>&1; then
    sha256sum "${fitxers[@]}" >"$empremta"
  else
    # Surt per stdout perquè Claude ho vegi en començar i ho pugui investigar.
    echo "Preparació del núvol: npm ci ha fallat (registre a $registre)."
    exit 0
  fi
fi

echo "Preparació del núvol: Node $(node -v) i dependències a punt."
exit 0
