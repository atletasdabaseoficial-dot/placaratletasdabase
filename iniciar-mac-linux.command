#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo " [ATENCAO] O Node.js nao esta instalado."
  echo " Baixe em: https://nodejs.org  (versao LTS), instale e rode este arquivo de novo."
  echo ""
  read -p "Pressione ENTER para sair..." _
  exit 1
fi
echo ""
echo " Iniciando o Placar Pro VNL... (deixe esta janela ABERTA)"
echo ""
( sleep 1 && (open http://localhost:3000/ 2>/dev/null || xdg-open http://localhost:3000/ 2>/dev/null) ) &
node server.js
