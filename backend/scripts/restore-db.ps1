param (
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,
    [string]$ContainerName = "pflex_mysql",
    [string]$DbUser = "root",
    [string]$DbPass = "rootpassword",
    [string]$DbName = "pflex_db"
)

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$resolvedBackup = Resolve-Path (Join-Path $scriptRoot "..\$BackupFile") -ErrorAction SilentlyContinue

if (!$resolvedBackup) {
    Write-Host "Error: Archivo de backup no encontrado: $BackupFile" -ForegroundColor Red
    exit 1
}

Write-Host "Restaurando base de datos $DbName en el contenedor $ContainerName desde $resolvedBackup..." -ForegroundColor Cyan

$restoreCommand = "exec mysql -u$DbUser -p$DbPass $DbName"
Get-Content $resolvedBackup -Raw | docker exec -i $ContainerName sh -c $restoreCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host "Restauración completada exitosamente" -ForegroundColor Green
} else {
    Write-Host "Error al restaurar la base de datos" -ForegroundColor Red
    exit $LASTEXITCODE
}
