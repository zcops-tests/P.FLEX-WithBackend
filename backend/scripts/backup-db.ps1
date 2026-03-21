$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "backups/pflex_backup_$timestamp.sql"

if (!(Test-Path "backups")) { New-Item -ItemType Directory -Path "backups" }

$dbUser = "root"
$dbPass = "pflex_secret"
$dbName = "pflex_db"

Write-Host "Iniciando backup de $dbName..." -ForegroundColor Cyan

# Use mysqldump (assumes it is in PATH or inside the docker container)
# If using docker:
docker exec pflex-db mysqldump -u$dbUser -p$dbPass $dbName > $backupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup completado existosamente: $backupFile" -ForegroundColor Green
} else {
    Write-Host "Error al realizar el backup" -ForegroundColor Red
}
