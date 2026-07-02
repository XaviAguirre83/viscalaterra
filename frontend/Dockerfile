# Imatge "web" de PRODUCCIÓ — multi-stage.
# Etapa 1 (build): compila la SPA de Vue → estàtics.
# Etapa 2 (runtime): Caddy serveix els estàtics, fa de reverse proxy cap al backend
#                    i gestiona el certificat HTTPS automàticament (al VPS).

# --- Etapa de build ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
# npm ci: instal·la EXACTAMENT el package-lock.json (build reproduïble).
RUN npm ci
COPY . .
RUN npm run build

# --- Etapa de runtime (Caddy) ---
FROM caddy:2-alpine AS runtime
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80 443
