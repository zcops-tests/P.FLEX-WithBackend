# Usage: .\scripts\restore-db.ps1 backups/some_backup.sql
param (
    [Parameter(Mandatory=$true)]
    [string]$backupFile
)

if (!(Test-Path $backupFile)) {
    Write-Host "Error: Archivo de backup no encontrado: $backupFile" -ForegroundColor Red
    exit 1
}

$dbUser = "root"
$dbPass = "pflex_secret"
$dbName = "pflex_db"

Write-Host "Restaurando base de datos $dbName desde $backupFile..." -ForegroundColor Cyan

# Use mysql (assumes it is in PATH or inside the docker container)
# If using docker:
cd backups
Get-Content (Resolve-Path "../$backupFile") | docker exec -i pflex-db mysql -u$dbUser -p$dbPass $dbName

if ($LASTEXITCODE -eq 0) {
    Write-Host "Restauración completada exitosamente" -ForegroundColor Green
} else {
    Write-Host "Error al restaurar la base de datos" -ForegroundColor Red
}
