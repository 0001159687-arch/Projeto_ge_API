@echo off
:: ============================================================
:: iniciarApi.bat
:: node-v24.13.0-win-x64 e Projeto-primeira-API ficam lado a lado
:: ============================================================

:: Pasta raiz do projeto (onde este .bat está)
SET "RAIZ=%~dp0"

:: Pasta PAI (um nível acima do projeto)
SET "PAI=%RAIZ%..\"

:: Node portátil está LADO A LADO com o projeto
SET "NODE=%PAI%node-v24.13.0-win-x64\node.exe"

IF NOT EXIST "%NODE%" (
    echo.
    echo [ERRO] node.exe nao encontrado!
    echo.
    echo Esperado em:
    echo   %NODE%
    echo.
    echo Estrutura esperada:
    echo   pasta-mae\
    echo   ├── node-v24.13.0-win-x64\   ^<-- Node aqui
    echo   └── Projeto-ge-API\    ^<-- este projeto aqui
    echo.
    pause
    exit /b 1
)

echo [OK] Node encontrado!

:: Instala dependencias se necessário
IF NOT EXIST "%RAIZ%node_modules" (
    echo.
    echo Instalando dependencias, aguarde...
    cd /d "%RAIZ%"
    "%NODE%" "%PAI%node-v24.13.0-win-x64\node_modules\npm\bin\npm-cli.js" install
    echo.
)

echo.
echo  ================================
echo   Sistema de Vendas - API REST
echo   http://localhost:3000
echo  ================================
echo.

cd /d "%RAIZ%"
"%NODE%" src\server.js

pause
