FROM node:22-bookworm-slim AS development

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

COPY . .

ENV NODE_ENV=development
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
