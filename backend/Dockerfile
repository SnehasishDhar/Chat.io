# --- Stage 1: Build stage ---
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# --- Stage 2: Production stage ---
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=build /app/dist ./dist

# Create upload directory and expose port
RUN mkdir -p uploads
EXPOSE 3001

ENV NODE_ENV=production
CMD ["node", "dist/app.js"]
