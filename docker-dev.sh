#!/bin/bash

# Script para gerenciar o ambiente de desenvolvimento Docker

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
    echo -e "${BLUE}  NotaFiscal - Ambiente DEV${NC}"
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

# Função para iniciar o ambiente
start_dev() {
    print_header
    print_message "Iniciando ambiente de desenvolvimento..."
    
    # Verificar se arquivo .env existe
    if [ ! -f .env ]; then
        print_warning "Arquivo .env não encontrado. Copiando de .env.example..."
        cp .env.example .env
        print_warning "Por favor, configure as variáveis em .env antes de continuar!"
        exit 1
    fi
    
    # Build e start dos containers
    docker-compose -f docker-compose.dev.yml up --build -d
    
    print_message "Ambiente iniciado com sucesso!"
    print_message "Frontend: http://localhost:5173"
    print_message "Backend: http://localhost:3001"
    print_message "Banco de dados: Supabase (configurado via .env)"
    print_message ""
    print_message "Para ver os logs: ./docker-dev.sh logs"
    print_message "Para parar: ./docker-dev.sh stop"
}

# Função para parar o ambiente
stop_dev() {
    print_message "Parando ambiente de desenvolvimento..."
    docker-compose -f docker-compose.dev.yml down
    print_message "Ambiente parado!"
}

# Função para mostrar logs
show_logs() {
    if [ -z "$2" ]; then
        docker-compose -f docker-compose.dev.yml logs -f
    else
        docker-compose -f docker-compose.dev.yml logs -f "$2"
    fi
}

# Função para restart
restart_dev() {
    print_message "Reiniciando ambiente de desenvolvimento..."
    docker-compose -f docker-compose.dev.yml restart
    print_message "Ambiente reiniciado!"
}

# Função para rebuild
rebuild_dev() {
    print_message "Fazendo rebuild do ambiente..."
    docker-compose -f docker-compose.dev.yml down
    docker-compose -f docker-compose.dev.yml up --build -d
    print_message "Rebuild concluído!"
}

# Função para mostrar status
show_status() {
    print_message "Status dos containers:"
    docker-compose -f docker-compose.dev.yml ps
}

# Função para limpar volumes
clean_volumes() {
    print_warning "Isso irá remover todos os dados de upload locais!"
    read -p "Tem certeza? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose -f docker-compose.dev.yml down -v
        print_message "Volumes removidos!"
    else
        print_message "Operação cancelada."
    fi
}

# Função para entrar no container
exec_container() {
    if [ -z "$2" ]; then
        print_error "Especifique o container: backend-dev, frontend-dev"
        exit 1
    fi
    
    case "$2" in
        "backend"|"backend-dev")
            docker-compose -f docker-compose.dev.yml exec backend-dev sh
            ;;
        "frontend"|"frontend-dev")
            docker-compose -f docker-compose.dev.yml exec frontend-dev sh
            ;;
        *)
            print_error "Container inválido. Use: backend-dev, frontend-dev"
            exit 1
            ;;
    esac
}

# Menu principal
case "$1" in
    "start")
        check_docker
        start_dev
        ;;
    "stop")
        stop_dev
        ;;
    "restart")
        restart_dev
        ;;
    "rebuild")
        check_docker
        rebuild_dev
        ;;
    "logs")
        show_logs "$@"
        ;;
    "status")
        show_status
        ;;
    "clean")
        clean_volumes
        ;;
    "exec")
        exec_container "$@"
        ;;
    *)
        print_header
        echo "Uso: $0 {start|stop|restart|rebuild|logs|status|clean|exec}"
        echo ""
        echo "Comandos disponíveis:"
        echo "  start   - Inicia o ambiente de desenvolvimento"
        echo "  stop    - Para o ambiente"
        echo "  restart - Reinicia os containers"
        echo "  rebuild - Reconstrói e inicia os containers"
        echo "  logs    - Mostra os logs (logs [service])"
        echo "  status  - Mostra o status dos containers"
        echo "  clean   - Remove volumes (CUIDADO: apaga dados!)"
        echo "  exec    - Entra no container (exec [backend-dev|frontend-dev])"
        echo ""
        exit 1
        ;;
esac