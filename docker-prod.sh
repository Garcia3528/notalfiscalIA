#!/bin/bash

# Script para gerenciar o ambiente de produção Docker

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  NotaFiscal - Ambiente PROD${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Verificar se Docker está instalado
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker não está instalado!"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose não está instalado!"
        exit 1
    fi
}

# Verificar configurações de produção
check_production_config() {
    if [ ! -f .env ]; then
        print_error "Arquivo .env não encontrado!"
        print_error "Copie .env.example para .env e configure as variáveis de produção."
        exit 1
    fi
    
    # Verificar se variáveis críticas estão configuradas
    source .env
    
    if [ "$JWT_SECRET" = "your-super-secret-jwt-key-change-this-in-production" ]; then
        print_error "JWT_SECRET ainda está com valor padrão! Configure uma chave segura."
        exit 1
    fi
    
    if [ "$GEMINI_API_KEY" = "your-gemini-api-key-here" ]; then
        print_error "GEMINI_API_KEY não está configurada!"
        exit 1
    fi
    
    if [ -z "$SUPABASE_URL" ] || [ "$SUPABASE_URL" = "https://your-project.supabase.co" ]; then
        print_error "SUPABASE_URL não está configurada corretamente!"
        exit 1
    fi
    
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] || [ "$SUPABASE_SERVICE_ROLE_KEY" = "your-supabase-service-role-key-here" ]; then
        print_error "SUPABASE_SERVICE_ROLE_KEY não está configurada!"
        exit 1
    fi
}

# Função para iniciar o ambiente
start_prod() {
    print_header
    print_message "Iniciando ambiente de produção..."
    
    check_production_config
    
    # Build e start dos containers
    docker-compose up --build -d
    
    print_message "Ambiente de produção iniciado com sucesso!"
    print_message "Frontend: http://localhost:${FRONTEND_PORT:-80}"
    print_message "Backend: http://localhost:3001"
    print_message "Banco de dados: Supabase (configurado via .env)"
    print_message ""
    print_message "Para ver os logs: ./docker-prod.sh logs"
    print_message "Para parar: ./docker-prod.sh stop"
}

# Função para parar o ambiente
stop_prod() {
    print_message "Parando ambiente de produção..."
    docker-compose down
    print_message "Ambiente parado!"
}

# Função para mostrar logs
show_logs() {
    if [ -z "$2" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f "$2"
    fi
}

# Função para restart
restart_prod() {
    print_message "Reiniciando ambiente de produção..."
    docker-compose restart
    print_message "Ambiente reiniciado!"
}

# Função para deploy (rebuild)
deploy_prod() {
    print_message "Fazendo deploy da aplicação..."
    check_production_config
    
    # Deploy sem backup local (dados estão no Supabase)
    print_message "Dados estão seguros no Supabase - prosseguindo com deploy..."
    
    # Deploy
    docker-compose down
    docker-compose up --build -d
    
    print_message "Deploy concluído com sucesso!"
}

# Função para mostrar status
show_status() {
    print_message "Status dos containers:"
    docker-compose ps
}

# Função para informações sobre backup do Supabase
backup_info() {
    print_message "=== INFORMAÇÕES SOBRE BACKUP ==="
    print_message "Este projeto usa Supabase como banco de dados."
    print_message "O Supabase oferece backup automático e point-in-time recovery."
    print_message ""
    print_message "Para fazer backup manual:"
    print_message "1. Acesse o painel do Supabase: https://app.supabase.com"
    print_message "2. Vá para Settings > Database"
    print_message "3. Use a opção de backup ou export"
    print_message ""
    print_message "Para mais informações: https://supabase.com/docs/guides/platform/backups"
}

# Função para entrar no container
exec_container() {
    if [ -z "$2" ]; then
        print_error "Especifique o container: backend, frontend"
        exit 1
    fi
    
    case "$2" in
        "backend")
            docker-compose exec backend sh
            ;;
        "frontend")
            docker-compose exec frontend sh
            ;;
        *)
            print_error "Container inválido. Use: backend, frontend"
            exit 1
            ;;
    esac
}

# Função para monitoramento
monitor() {
    print_message "Monitoramento dos containers (Ctrl+C para sair):"
    watch -n 2 'docker-compose ps && echo "" && docker stats --no-stream'
}

# Menu principal
case "$1" in
    "start")
        check_docker
        start_prod
        ;;
    "stop")
        stop_prod
        ;;
    "restart")
        restart_prod
        ;;
    "deploy")
        check_docker
        deploy_prod
        ;;
    "logs")
        show_logs "$@"
        ;;
    "status")
        show_status
        ;;
    "backup")
        backup_info
        ;;
    "restore")
        backup_info
        ;;
    "exec")
        exec_container "$@"
        ;;
    "monitor")
        monitor
        ;;
    *)
        print_header
        echo "Uso: $0 {start|stop|restart|deploy|logs|status|backup|restore|exec|monitor}"
        echo ""
        echo "Comandos disponíveis:"
        echo "  start   - Inicia o ambiente de produção"
        echo "  stop    - Para o ambiente"
        echo "  restart - Reinicia os containers"
        echo "  deploy  - Faz deploy da aplicação (rebuild)"
        echo "  logs    - Mostra os logs (logs [service])"
        echo "  status  - Mostra o status dos containers"
        echo "  backup  - Mostra informações sobre backup do Supabase"
        echo "  restore - Mostra informações sobre backup do Supabase"
        echo "  exec    - Entra no container (exec [backend|frontend])"
        echo "  monitor - Monitora recursos dos containers"
        echo ""
        exit 1
        ;;
esac