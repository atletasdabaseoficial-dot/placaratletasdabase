@echo off
chcp 65001 >nul
title Placar Pro VNL
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [ATENCAO] O Node.js nao esta instalado neste computador.
  echo  1^) Baixe em: https://nodejs.org  ^(botao verde LTS^)
  echo  2^) Instale ^(pode ir clicando em Avancar^)
  echo  3^) Feche e abra este arquivo de novo.
  echo.
  pause
  exit /b
)

echo.
echo  Iniciando o Placar Pro VNL...
echo  ^(Deixe ESTA JANELA ABERTA durante toda a transmissao^)
echo.
start "" http://localhost:3000/
node server.js
echo.
echo  O servidor foi encerrado. Pode fechar esta janela.
pause
