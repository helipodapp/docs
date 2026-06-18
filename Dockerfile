# ---- Stage 1: Install dependencies ----
FROM oven/bun:1-alpine AS deps

# Install system dependencies
RUN apk add --no-cache libc6-compat tini git openssl

WORKDIR /app

# Copy package.json and bun.lockb for dependency installation
COPY package.json bun.lockb* ./

# Install all dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# ---- Stage 2: Build ----
FROM oven/bun:1-alpine AS builder

# Install system dependencies needed for build
RUN apk add --no-cache libc6-compat git openssl

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Generate Prisma client if schema exists
RUN if [ -f packages/db/schema.prisma ]; then npx prisma generate --schema=packages/db/schema.prisma; elif [ -f prisma/schema.prisma ]; then npx prisma generate --schema=prisma/schema.prisma; fi

# Run the full build: build:pre -> next build -> build:post
RUN bun run build

# ---- Stage 3: Production ----
FROM oven/bun:1-alpine AS runner

# Install minimal runtime dependencies
RUN apk add --no-cache libc6-compat tini

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Use tini as init process
ENTRYPOINT ["tini", "--"]

# Switch to non-root user
USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
