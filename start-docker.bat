@echo off
echo Iniciando o ambiente Docker para o projeto NotaFiscal...

echo Construindo as imagens Docker...
docker-compose build

echo Iniciando os containers...
docker-compose up -d

echo Verificando os containers em execucao...
docker-compose ps

echo Ambiente Docker iniciado com sucesso!
set FRONTEND_PORT=%FRONTEND_PORT%
if "%FRONTEND_PORT%"=="" set FRONTEND_PORT=80
echo Frontend: http://localhost:%FRONTEND_PORT%
set PORT=%PORT%
if "%PORT%"=="" set PORT=3001
echo Backend: http://localhost:%PORT%

pause