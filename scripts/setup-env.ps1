# Crea .env desde .env.example si no existe (mismas credenciales que docker-compose)
$root = Split-Path $PSScriptRoot -Parent
$example = Join-Path $root ".env.example"
$envFile = Join-Path $root ".env"

if (Test-Path $envFile) {
  Write-Host "Ya existe .env — no se sobrescribe."
  Write-Host "Ruta: $envFile"
  exit 0
}

if (-not (Test-Path $example)) {
  Write-Host "ERROR: no se encuentra .env.example en $root"
  exit 1
}

Copy-Item $example $envFile
Write-Host "Creado: $envFile"
Write-Host "Siguiente paso: docker compose up -d --build"
