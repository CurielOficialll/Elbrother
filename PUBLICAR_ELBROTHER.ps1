# Script de Publicación Manual para Elbrother POS
$ErrorActionPreference = "Stop"

$version = (Get-Content package.json | ConvertFrom-Json).version
Write-Host ""
Write-Host "  PUBLICAR ELBROTHER POS v$version" -ForegroundColor Cyan
Write-Host ""

Write-Host "--- 1. Limpiando carpetas anteriores ---" -ForegroundColor Cyan
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path "Releases") { Remove-Item -Recurse -Force "Releases" }

Write-Host "--- 2. Instalando dependencias ---" -ForegroundColor Cyan
npm install

Write-Host "--- 3. Compilando aplicación Electron ---" -ForegroundColor Cyan
npm run build:win -- --publish never

Write-Host "--- 4. Empaquetando con Velopack ---" -ForegroundColor Cyan
$vpkPath = "$env:USERPROFILE\.dotnet\tools\vpk.exe"
if (-not (Test-Path $vpkPath)) {
    Write-Host "Error: No se encontró vpk.exe. Intentando instalar..." -ForegroundColor Yellow
    dotnet tool install -g vpk
}

& $vpkPath pack -u elbrother -v $version -p dist\win-unpacked -e "Elbrother POS.exe"

Write-Host "--- 5. Subiendo a GitHub Releases ---" -ForegroundColor Cyan
gh release create "v$version" .\Releases\* --title "Versión $version" --notes "Actualización Elbrother POS v$version"

Write-Host ""
Write-Host "--- PROCESO COMPLETADO ---" -ForegroundColor Green
Write-Host "El cliente recibirá la actualización automáticamente al iniciar la app."
pause
