param(
    [string]$ContainerName = "pflex_mysql",
    [string]$DbUser = "root",
    [string]$DbPass = "rootpassword",
    [string]$DbName = "pflex_db",
    [string]$OutputDir = "backups"
)

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backupDir = Join-Path $scriptRoot "..\$OutputDir"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$backupFile = Join-Path $backupDir "pflex_backup_$timestamp.sql"

Write-Host "Iniciando backup de $DbName desde el contenedor $ContainerName..." -ForegroundColor Cyan

$dumpCommand = "exec mysqldump --single-transaction --quick --routines --triggers -u$DbUser -p$DbPass $DbName"
docker exec $ContainerName sh -c $dumpCommand > $backupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup completado exitosamente: $backupFile" -ForegroundColor Green
} else {
    Write-Host "Error al realizar el backup" -ForegroundColor Red
    exit $LASTEXITCODE
}
