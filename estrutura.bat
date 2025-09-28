@echo off
setlocal

:: Define o nome do arquivo de saída
set "saida=estrutura_pasta.txt"

:: Define o caminho da pasta (pode ser alterado conforme necessário)
set "pasta=%~dp0"

:: Gera a estrutura da pasta e salva no arquivo
tree "%pasta%" /F /A > "%saida%"

echo Estrutura da pasta salva em %saida%
pause
