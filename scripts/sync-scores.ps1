# Synchro des scores CDM 2026 — appelle l'endpoint local /api/sync-scores.
# Lancé par la tâche planifiée "PronoGoat-SyncScores" toutes les 15 min.
# Ne fait rien d'utile si le serveur de dev (npm run dev) n'est pas lancé.

$root    = "C:\Users\PC\Documents\goat deen code"
$envFile = Join-Path $root ".env.local"
$log     = Join-Path $root "scripts\sync.log"

$match = Select-String -Path $envFile -Pattern '^CRON_SECRET=(.+)$' -ErrorAction SilentlyContinue
if (-not $match) {
  "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  ERREUR  CRON_SECRET introuvable dans .env.local" | Add-Content $log
  return
}
$secret = $match.Matches.Groups[1].Value.Trim()

try {
  $r = Invoke-RestMethod -Uri "http://localhost:3000/api/sync-scores?secret=$secret" -TimeoutSec 60 -ErrorAction Stop
  "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  OK  synced=$($r.synced) finished=$($r.finished) live=$($r.live)" | Add-Content $log
} catch {
  "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  ERREUR  $($_.Exception.Message)" | Add-Content $log
}
