param(
    [Parameter(Mandatory = $true)]
    [string]$BackendUrl,

    [int]$Port = 5173
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..\..")
$frontendDir = Join-Path $repoRoot "frontend"

if (-not (Test-Path $frontendDir)) {
    throw "No se encontro el directorio frontend en: $frontendDir"
}

$env:VITE_API_URL = $BackendUrl

Write-Host "VITE_API_URL configurado a: $BackendUrl" -ForegroundColor Cyan
Write-Host "Iniciando frontend demo en puerto $Port..." -ForegroundColor Green

Push-Location $frontendDir
try {
    npm.cmd run dev -- --host 0.0.0.0 --port $Port
}
finally {
    Pop-Location
}
