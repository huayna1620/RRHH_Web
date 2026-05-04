param(
    [string]$FrontendUrl
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..\..")
$apiProject = Join-Path $repoRoot "backend\src\Hrms.Api\Hrms.Api.csproj"

if (-not (Test-Path $apiProject)) {
    throw "No se encontro el proyecto API en: $apiProject"
}

$env:ASPNETCORE_ENVIRONMENT = "Development"

if ($FrontendUrl) {
    $env:Cors__AllowedOrigins__0 = $FrontendUrl
    Write-Host "CORS de demo configurado para: $FrontendUrl" -ForegroundColor Cyan
} else {
    Write-Host "Sin -FrontendUrl: se usara CORS segun appsettings.Development.json" -ForegroundColor Yellow
}

Write-Host "Iniciando backend demo en perfil https (puerto 7177)..." -ForegroundColor Green
dotnet run --project $apiProject --launch-profile https
