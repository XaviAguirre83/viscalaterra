#!/bin/sh
# En néixer la BD, hi aplica totes les migracions (infra/db/migracions/): una BD
# nova queda igual que una d'existent que les hagi anat aplicant. Va després de
# 06-rol-aplicacio.sh perquè les taules noves heretin els permisos del rol de la web.
# Amb «sh» n'hi ha prou que el fitxer es pugui llegir (no depèn del bit d'execució).
exec sh /migracions/migra.sh
