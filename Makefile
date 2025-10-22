# Makefile para NotaFiscal Docker

.PHONY: help dev-start dev-stop dev-restart dev-logs prod-start prod-stop prod-deploy backup restore clean

# Cores para output
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m

# Comando padrão
help: ## Mostra esta ajuda
	@echo "$(GREEN)NotaFiscal - Comandos Docker$(NC)"
	@echo "================================"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "$(YELLOW)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Comandos de Desenvolvimento
dev-start: ## Inicia ambiente de desenvolvimento
	@echo "$(GREEN)Iniciando ambiente de desenvolvimento...$(NC)"
	@docker-compose -f docker-compose.dev.yml up --build -d
	@echo "$(GREEN)Ambiente iniciado!$(NC)"
	@echo "Frontend: http://localhost:5173"
	@echo "Backend: http://localhost:3001"
	@echo "Adminer: http://localhost:8080"

dev-stop: ## Para ambiente de desenvolvimento
	@echo "$(YELLOW)Parando ambiente de desenvolvimento...$(NC)"
	@docker-compose -f docker-compose.dev.yml down

dev-restart: ## Reinicia ambiente de desenvolvimento
	@echo "$(YELLOW)Reiniciando ambiente de desenvolvimento...$(NC)"
	@docker-compose -f docker-compose.dev.yml restart

dev-rebuild: ## Reconstrói ambiente de desenvolvimento
	@echo "$(YELLOW)Reconstruindo ambiente de desenvolvimento...$(NC)"
	@docker-compose -f docker-compose.dev.yml down
	@docker-compose -f docker-compose.dev.yml up --build -d

dev-logs: ## Mostra logs do ambiente de desenvolvimento
	@docker-compose -f docker-compose.dev.yml logs -f

dev-status: ## Mostra status dos containers de desenvolvimento
	@docker-compose -f docker-compose.dev.yml ps

# Comandos de Produção
prod-start: ## Inicia ambiente de produção
	@echo "$(GREEN)Iniciando ambiente de produção...$(NC)"
	@docker-compose up --build -d
	@echo "$(GREEN)Ambiente iniciado!$(NC)"
	@echo "Frontend: http://localhost"
	@echo "Backend: http://localhost:3001"
	@echo "Adminer: http://localhost:8080"

prod-stop: ## Para ambiente de produção
	@echo "$(YELLOW)Parando ambiente de produção...$(NC)"
	@docker-compose down

prod-restart: ## Reinicia ambiente de produção
	@echo "$(YELLOW)Reiniciando ambiente de produção...$(NC)"
	@docker-compose restart

prod-deploy: ## Faz deploy da aplicação
	@echo "$(GREEN)Fazendo deploy da aplicação...$(NC)"
	@docker-compose down
	@docker-compose up --build -d
	@echo "$(GREEN)Deploy concluído!$(NC)"

prod-logs: ## Mostra logs do ambiente de produção
	@docker-compose logs -f

prod-status: ## Mostra status dos containers de produção
	@docker-compose ps

## 🔄 Backup e Restore (Supabase)
backup-info: ## Mostra informações sobre backup do Supabase
	@echo "$(GREEN)Informações sobre backup do Supabase:$(NC)"
	@./docker-prod.sh backup

restore-info: ## Mostra informações sobre restore do Supabase
	@echo "$(GREEN)Informações sobre restore do Supabase:$(NC)"
	@./docker-prod.sh restore

# Comandos de Limpeza
clean: ## Remove containers, volumes e imagens não utilizadas
	@echo "$(YELLOW)Limpando recursos Docker...$(NC)"
	@docker-compose -f docker-compose.dev.yml down -v --remove-orphans
	@docker-compose down -v --remove-orphans
	@docker system prune -f
	@echo "$(GREEN)Limpeza concluída!$(NC)"

clean-volumes: ## Remove apenas os volumes (CUIDADO: apaga dados!)
	@echo "$(RED)ATENÇÃO: Isso irá remover todos os dados!$(NC)"
	@read -p "Tem certeza? (y/N): " confirm && [ "$$confirm" = "y" ]
	@docker-compose -f docker-compose.dev.yml down -v
	@docker-compose down -v
	@echo "$(GREEN)Volumes removidos!$(NC)"

# Comandos de Monitoramento
monitor: ## Monitora recursos dos containers
	@watch -n 2 'docker-compose ps && echo "" && docker stats --no-stream'

# Comandos de Acesso
shell-backend: ## Acessa shell do container backend
	@docker-compose exec backend sh

shell-frontend: ## Acessa shell do container frontend
	@docker-compose exec frontend sh

shell-supabase: ## Mostra informações para acessar Supabase
	@echo "$(GREEN)Para acessar o Supabase:$(NC)"
	@echo "1. Acesse: https://app.supabase.com"
	@echo "2. Faça login na sua conta"
	@echo "3. Selecione seu projeto"
	@echo "4. Use o SQL Editor para executar queries"

# Comandos de Setup
setup: ## Configura ambiente inicial
	@echo "$(GREEN)Configurando ambiente inicial...$(NC)"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(YELLOW)Arquivo .env criado. Configure as variáveis antes de continuar!$(NC)"; \
	else \
		echo "$(GREEN)Arquivo .env já existe.$(NC)"; \
	fi

# Comandos de Teste
test-backend: ## Executa testes do backend
	@docker-compose -f docker-compose.dev.yml exec backend npm test

test-frontend: ## Executa testes do frontend
	@docker-compose -f docker-compose.dev.yml exec frontend npm test

# Comandos de Build
build-backend: ## Constrói apenas a imagem do backend
	@docker-compose build backend

build-frontend: ## Constrói apenas a imagem do frontend
	@docker-compose build frontend

build-all: ## Constrói todas as imagens
	@docker-compose build