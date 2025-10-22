# Backend Dockerfile
FROM node:18-alpine AS base

# Instalar dependências do sistema necessárias para pdf-parse
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Stage de desenvolvimento
FROM base AS development
RUN npm ci --include=dev
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]

# Stage de produção
FROM base AS production

# Instalar apenas dependências de produção
RUN npm ci --only=production && npm cache clean --force

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copiar código da aplicação
COPY --chown=nodejs:nodejs . .

# Criar diretório de uploads com permissões corretas
RUN mkdir -p uploads && chown -R nodejs:nodejs uploads

# Mudar para usuário não-root
USER nodejs

# Expor porta
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Comando de inicialização
CMD ["npm", "start"]