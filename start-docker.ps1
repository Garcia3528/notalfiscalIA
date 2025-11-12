# Script para iniciar o Docker no Windows
Write-Host "Iniciando o ambiente Docker para o projeto NotaFiscal..." -ForegroundColor Green

# Verifica se o Docker Desktop está instalado
$dockerDesktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
if (-not (Test-Path $dockerDesktopPath)) {
    Write-Host "Docker Desktop não encontrado. Por favor, instale o Docker Desktop primeiro." -ForegroundColor Red
    Write-Host "Download: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    exit 1
}

# Tenta iniciar o Docker Desktop
Write-Host "Iniciando Docker Desktop..." -ForegroundColor Yellow
Start-Process $dockerDesktopPath
Write-Host "Aguardando o Docker iniciar (30 segundos)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Verifica se o Docker está respondendo
Write-Host "Verificando conexão com o Docker..." -ForegroundColor Yellow
$dockerRunning = $false
$attempts = 0
$maxAttempts = 5

while (-not $dockerRunning -and $attempts -lt $maxAttempts) {
    try {
        $result = docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            $dockerRunning = $true
            Write-Host "Docker está em execução!" -ForegroundColor Green
        } else {
            $attempts++
            Write-Host "Tentativa $attempts de $maxAttempts - Docker ainda não está pronto..." -ForegroundColor Yellow
            Start-Sleep -Seconds 10
        }
    } catch {
        $attempts++
        Write-Host "Tentativa $attempts de $maxAttempts - Erro ao verificar o Docker..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    }
}

if (-not $dockerRunning) {
    Write-Host "Não foi possível conectar ao Docker após várias tentativas." -ForegroundColor Red
    Write-Host "Por favor, verifique se o Docker Desktop está em execução e tente novamente." -ForegroundColor Yellow
    exit 1
}

# Constrói e inicia os containers
Write-Host "Construindo as imagens Docker..." -ForegroundColor Green
docker-compose build

Write-Host "Iniciando os containers..." -ForegroundColor Green
docker-compose up -d

Write-Host "Verificando os containers em execução..." -ForegroundColor Green
docker-compose ps

Write-Host "Ambiente Docker iniciado com sucesso!" -ForegroundColor Green
$frontendPort = $env:FRONTEND_PORT
if (-not $frontendPort) { $frontendPort = 80 }
Write-Host ("Frontend: http://localhost:{0}" -f $frontendPort) -ForegroundColor Cyan
$backendPort = $env:PORT
if (-not $backendPort) { $backendPort = 3001 }
Write-Host ("Backend: http://localhost:{0}" -f $backendPort) -ForegroundColor Cyan