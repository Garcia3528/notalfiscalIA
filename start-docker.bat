@echo off
echo Iniciando o ambiente Docker para o projeto NotaFiscal...

echo Construindo as imagens Docker...
docker-compose build

echo Iniciando os containers...
docker-compose up -d

echo Verificando os containers em execucao...
docker-compose ps

echo Ambiente Docker iniciado com sucesso!
echo Frontend: http://localhost:3000
echo Backend: http://localhost:3001

pause