
# Script de Publicación Manual para Elbrother POS
$ErrorActionPreference = "Stop"

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

$version = (Get-Content package.json | ConvertFrom-Json).version
& $vpkPath pack -u elbrother -v $version -p dist\win-unpacked -e "Elbrother POS.exe"

Write-Host "--- 5. Subiendo a GitHub Releases ---" -ForegroundColor Cyan
gh release create "v$version" .\Releases\* --title "Versión $version" --notes "Actualización de seguridad y base de datos (Publicación Local)"

Write-Host "--- ¡PROCESO COMPLETADO! ---" -ForegroundColor Green
Write-Host "Tus clientes ya pueden descargar la actualización."
pause
