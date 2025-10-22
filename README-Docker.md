# NotaFiscal - Guia Docker

## Configuração de DNS

Para resolver problemas de conectividade com o Supabase, o sistema está configurado para usar servidores DNS alternativos (Google 8.8.8.8 e Cloudflare 1.1.1.1) nos contêineres Docker. Isso ajuda a resolver problemas como:

```
⚠️ Erro de DNS ao resolver xbefxeholjkfkiuymdrg.supabase.co: getaddrinfo ENOTFOUND
```

Se você ainda enfrentar problemas de conectividade, verifique:
1. Se sua rede permite acesso aos servidores DNS externos
2. Se o domínio do Supabase está correto em seu arquivo `.env`

Este guia fornece instruções completas para executar a aplicação NotaFiscal usando Docker.

## 📋 Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) (versão 20.10 ou superior)
- [Docker Compose](https://docs.docker.com/compose/install/) (versão 2.0 ou superior)
- Git (para clonar o repositório)

### Verificar Instalação

```bash
docker --version
docker-compose --version
```

## 🚀 Início Rápido

### 1. Configuração Inicial

```bash
# Clone o repositório (se ainda não fez)
git clone <url-do-repositorio>
cd NotaFiscal

# Configure as variáveis de ambiente
cp .env.example .env
```

### 2. Configure o arquivo .env

Edite o arquivo `.env` e configure as seguintes variáveis obrigatórias:

```env
# Configurações do Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anonima-supabase
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-supabase

# Configurações da API
GEMINI_API_KEY=sua-chave-gemini-aqui
JWT_SECRET=sua-chave-jwt-super-secreta-aqui
```

### 3. Executar a Aplicação

#### Ambiente de Desenvolvimento

```bash
# Usando Make (recomendado)
make dev-start

# Ou usando Docker Compose diretamente
docker-compose -f docker-compose.dev.yml up --build -d

# Ou usando o script
./docker-dev.sh start
```

#### Ambiente de Produção

```bash
# Usando Make (recomendado)
make prod-start

# Ou usando Docker Compose diretamente
docker-compose up --build -d

# Ou usando o script
./docker-prod.sh start
```

## 🌐 Acessos

### Desenvolvimento
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001
- **Banco de Dados**: Supabase (configurado via .env)

### Produção
- **Frontend**: http://localhost
- **Backend**: http://localhost:3001
- **Banco de Dados**: Supabase (configurado via .env)

## 📁 Estrutura dos Containers

### Backend
- **Imagem**: Node.js 18 Alpine
- **Porta**: 3001
- **Volumes**: 
  - `uploads_data:/app/uploads` (arquivos enviados)
  - `./backend:/app` (desenvolvimento - hot reload)

### Frontend
- **Desenvolvimento**: Node.js 18 Alpine com Vite
- **Produção**: Nginx Alpine
- **Porta**: 5173 (dev) / 80 (prod)
- **Volumes**: `./frontend:/app` (desenvolvimento - hot reload)

### Database
- **Serviço**: Supabase (PostgreSQL hospedado)
- **Configuração**: Via variáveis de ambiente (.env)
- **Acesso**: Dashboard do Supabase (https://app.supabase.com)

## 🛠️ Comandos Úteis

### Usando Make (Recomendado)

```bash
# Ver todos os comandos disponíveis
make help

# Desenvolvimento
make dev-start          # Iniciar ambiente de desenvolvimento
make dev-stop           # Parar ambiente de desenvolvimento
make dev-restart        # Reiniciar ambiente de desenvolvimento
make dev-logs           # Ver logs do desenvolvimento
make dev-status         # Status dos containers

# Produção
make prod-start         # Iniciar ambiente de produção
make prod-stop          # Parar ambiente de produção
make prod-deploy        # Deploy com backup automático
make prod-logs          # Ver logs da produção

# Banco de Dados (Supabase)
make backup-info        # Informações sobre backup do Supabase
make restore-info       # Informações sobre restore do Supabase

# Acesso aos containers
make shell-backend      # Acessar shell do backend
make shell-frontend     # Acessar shell do frontend
make shell-supabase     # Informações para acessar Supabase

# Limpeza
make clean             # Limpar recursos Docker
make clean-volumes     # Remover volumes (CUIDADO!)
```

### Usando Scripts

```bash
# Desenvolvimento
./docker-dev.sh start
./docker-dev.sh stop
./docker-dev.sh logs
./docker-dev.sh exec backend

# Produção
./docker-prod.sh start
./docker-prod.sh deploy
./docker-prod.sh backup
./docker-prod.sh monitor
```

### Usando Docker Compose Diretamente

```bash
# Desenvolvimento
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml logs -f
docker-compose -f docker-compose.dev.yml down

# Produção
docker-compose up -d
docker-compose logs -f
docker-compose down
```

## 🔧 Configurações Avançadas

### Variáveis de Ambiente

| Variável | Descrição | Padrão | Obrigatória |
|----------|-----------|---------|-------------|
| `SUPABASE_URL` | URL do projeto Supabase | - | **Sim** |
| `SUPABASE_ANON_KEY` | Chave anônima do Supabase | - | **Sim** |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role do Supabase | - | **Sim** |
| `GEMINI_API_KEY` | Chave da API Gemini | - | **Sim** |
| `JWT_SECRET` | Chave secreta JWT | - | **Sim** |
| `BCRYPT_ROUNDS` | Rounds do bcrypt | `10` | Não |
| `MAX_FILE_SIZE` | Tamanho máximo do arquivo | `10485760` | Não |
| `FRONTEND_PORT` | Porta do frontend | `80` | Não |

### Personalizar Portas

Para alterar as portas, edite o arquivo `.env`:

```env
# Alterar porta do frontend
FRONTEND_PORT=8080
```

### Volumes Persistentes

Os dados são armazenados em volumes Docker:

- `uploads_data`: Arquivos enviados (dados locais)
- Banco de dados: Gerenciado pelo Supabase (na nuvem)

Para fazer backup dos volumes locais:

```bash
# Backup do volume de uploads
docker run --rm -v notafiscal_uploads_data:/data -v $(pwd):/backup alpine tar czf /backup/uploads_backup.tar.gz -C /data .

# Restaurar backup de uploads
docker run --rm -v notafiscal_uploads_data:/data -v $(pwd):/backup alpine tar xzf /backup/uploads_backup.tar.gz -C /data
```

## 🐛 Troubleshooting

### Problemas Comuns

#### 1. Erro de Permissão (Linux/Mac)

```bash
# Dar permissão aos scripts
chmod +x docker-dev.sh docker-prod.sh
```

#### 2. Porta já em uso

```bash
# Verificar processos usando a porta
netstat -tulpn | grep :3001

# Parar containers conflitantes
docker ps
docker stop <container_id>
```

#### 3. Erro de Build

```bash
# Limpar cache do Docker
docker system prune -a

# Rebuild forçado
docker-compose build --no-cache
```

#### 4. Problemas com Supabase

```bash
# Verificar configurações do Supabase no .env
cat .env | grep SUPABASE

# Verificar logs do backend para erros de conexão
docker-compose logs backend
```

#### 5. Frontend não carrega

```bash
# Verificar logs do frontend
docker-compose logs frontend

# Verificar se o build foi bem-sucedido
docker-compose exec frontend ls -la /usr/share/nginx/html
```

### Logs e Debugging

```bash
# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f backend

# Ver logs com timestamp
docker-compose logs -f -t

# Seguir apenas as últimas 100 linhas
docker-compose logs -f --tail=100
```

### Health Checks

Todos os containers possuem health checks configurados:

```bash
# Verificar status de saúde
docker-compose ps

# Ver detalhes do health check
docker inspect <container_name> | grep -A 10 Health
```

## 🔄 Backup e Restore (Supabase)

### Backup do Banco de Dados

O backup do banco de dados é gerenciado pelo Supabase:

```bash
# Ver informações sobre backup
make backup-info

# Ou usando o script diretamente
./docker-prod.sh backup
```

**Opções de backup no Supabase:**
1. **Backup automático**: Configurado no dashboard do Supabase
2. **Backup manual**: Via dashboard do Supabase > Settings > Database
3. **Export SQL**: Via SQL Editor no dashboard

### Restore

```bash
# Ver informações sobre restore
make restore-info

# Ou usando o script diretamente
./docker-prod.sh restore
```

### Backup dos Uploads (Volumes Locais)

```bash
# Script de backup dos uploads
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p backups/$DATE

# Backup dos uploads (dados locais)
docker run --rm -v notafiscal_uploads_data:/data -v $(pwd)/backups/$DATE:/backup alpine tar czf /backup/uploads.tar.gz -C /data .

echo "Backup dos uploads salvo em: backups/$DATE/uploads.tar.gz"
echo "Backup do banco: Gerenciado pelo Supabase"
```

## 🚀 Deploy em Produção

### Preparação

1. **Configure variáveis de produção**:
   ```env
   NODE_ENV=production
   JWT_SECRET=chave-super-secreta-de-producao
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-real
   GEMINI_API_KEY=sua-chave-real
   ```

2. **Configure domínio** (se aplicável):
   ```env
   FRONTEND_URL=https://seudominio.com
   ```

### Deploy

```bash
# Deploy da aplicação
make prod-deploy

# Ou manualmente
./docker-prod.sh deploy
```

### Monitoramento

```bash
# Monitorar recursos
make monitor

# Ver status
make prod-status

# Logs em tempo real
make prod-logs
```

### Reverse Proxy (Nginx/Apache)

Para usar com reverse proxy, configure:

```nginx
# Nginx
server {
    listen 80;
    server_name seudominio.com;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📊 Monitoramento e Logs

### Métricas

```bash
# Uso de recursos
docker stats

# Espaço em disco
docker system df

# Informações dos containers
docker-compose ps
```

### Logs Centralizados

Para produção, considere usar:

- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Grafana + Prometheus**
- **Docker Logging Drivers**

### Alertas

Configure alertas para:

- Uso de CPU/Memória alto
- Espaço em disco baixo
- Containers que param de funcionar
- Falhas de health check

## 🔒 Segurança

### Boas Práticas

1. **Configure chaves Supabase seguras**
2. **Configure JWT_SECRET forte**
3. **Use HTTPS em produção**
4. **Mantenha Docker atualizado**
5. **Limite recursos dos containers**
6. **Use usuários não-root nos containers**
7. **Configure RLS (Row Level Security) no Supabase**

### Configurações de Segurança

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          memory: 256M
```

## 📞 Suporte

Para problemas ou dúvidas:

1. Verifique os logs: `make dev-logs` ou `make prod-logs`
2. Consulte este guia de troubleshooting
3. Verifique a documentação do Docker
4. Abra uma issue no repositório

## 📝 Changelog

### v1.1.0
- Integração com Supabase (PostgreSQL hospedado)
- Remoção do PostgreSQL local e Adminer
- Atualização de scripts e documentação
- Simplificação do setup de banco de dados

### v1.0.0
- Setup inicial do Docker
- Ambientes de desenvolvimento e produção
- Scripts de automação
- Documentação completa
- Health checks e monitoramento
- Backup e restore automático