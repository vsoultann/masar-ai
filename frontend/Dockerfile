# Frontend image (multi-stage, Next.js standalone output).
#
# Build context is frontend/.  The standalone build traces only the modules the
# app actually imports, which turns a ~500 MB node_modules into a ~50 MB runtime
# layer -- the difference between fitting a free tier and not.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Baked into the client bundle at build time, so it must be supplied here and
# not only at run time.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 10001 -S masar && adduser -S -u 10001 -G masar masar

COPY --from=builder /app/public ./public
COPY --from=builder --chown=masar:masar /app/.next/standalone ./
COPY --from=builder --chown=masar:masar /app/.next/static ./.next/static

USER masar
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
