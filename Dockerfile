# --- deps + build stage ---
FROM node:22-alpine AS builder
WORKDIR /app

# OpenSSL for Prisma on Alpine
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- runtime stage ---
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# La CLI de Prisma va dentro de la imagen. Antes se bajaba con `npx prisma@5.22.0` en
# cada arranque: dependia de internet y de un HOME escribible, y fallaba sin ellos.
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

# Migra, garantiza un usuario con acceso (scripts/bootstrap.mjs) y arranca.
# Si cualquiera de los dos primeros pasos falla, el contenedor no levanta.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node scripts/bootstrap.mjs && exec node server.js"]
