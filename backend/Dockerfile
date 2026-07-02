# Imatge de PRODUCCIÓ del backend — multi-stage.
# Etapa 1 (build): compila TypeScript → dist/.
# Etapa 2 (runtime): imatge mínima, només dependències de producció, usuari no-root.

# --- Etapa de build ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
# npm ci: instal·la EXACTAMENT el package-lock.json (build reproduïble).
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# --- Etapa de runtime ---
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Només dependències de producció (sense ts-node-dev, typescript, etc.).
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
# Codi ja compilat des de l'etapa de build.
COPY --from=build /app/dist ./dist
# Les geodades (backend/data) NO es copien: es munten com a volum en temps d'execució.
# Usuari no-root (ja existeix a la imatge oficial de node).
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
