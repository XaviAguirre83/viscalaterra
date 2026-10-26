# Imatge "web" de PRODUCCIÓ — multi-stage.
# Etapa 1 (build): compila la SPA de Vue → estàtics.
# Etapa 2 (runtime): Caddy serveix els estàtics, fa de reverse proxy cap al backend
#                    i gestiona el certificat HTTPS automàticament (al VPS).

# --- Etapa de build ---
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
# npm ci: instal·la EXACTAMENT el package-lock.json (build reproduïble).
RUN npm ci
COPY . .
# Client ID de Google (és públic) per al botó «Continua amb Google». Arriba del
# GOOGLE_CLIENT_ID del .env del servidor via docker-compose.prod.yml (build.args);
# Vite el llegeix de l'entorn en compilar. Buit → el botó no apareix.
ARG VITE_GOOGLE_CLIENT_ID=
RUN npm run build

# --- Etapa de runtime (Caddy) ---
FROM caddy:2-alpine AS runtime
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80 443
