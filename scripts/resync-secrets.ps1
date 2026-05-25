# Re-create all Secret Manager secrets with CLEAN values (no trailing CR/LF).
# The original deploy created them via `$val | gcloud ... --data-file=-`, which
# appended PowerShell's pipe newline(s) — breaking strict string-equality auth
# (worker-auth-secret) and risking subtle failures elsewhere (Gmail token, etc).
#
# Writes each .env value (TrimEnd'd) to a temp file as raw UTF8 bytes WITHOUT a
# trailing newline, then `gcloud secrets versions add --data-file=<tmp>`.
#
# Run from repo root after `gcloud auth login`.

$ErrorActionPreference = "Stop"
$PROJECT = "aiwebatelier-spine"
$envPath = Join-Path $PSScriptRoot "..\.env"

# secretName -> .env var name
$map = @{
  "admin-auth-secret"         = "AUTH_SECRET"
  "admin-password-hash"       = "ADMIN_PASSWORD_HASH"
  "supabase-database-url"     = "DATABASE_URL"
  "supabase-direct-url"       = "DIRECT_URL"
  "google-maps-api-key"       = "GOOGLE_MAPS_API_KEY"
  "gmail-oauth-client-id"     = "GMAIL_OAUTH_CLIENT_ID"
  "gmail-oauth-client-secret" = "GMAIL_OAUTH_CLIENT_SECRET"
  "gmail-oauth-refresh-token" = "GMAIL_OAUTH_REFRESH_TOKEN"
  "cloudflare-api-token"      = "CLOUDFLARE_API_TOKEN"
  "psi-api-key"               = "PSI_API_KEY"
  "worker-auth-secret"        = "WORKER_AUTH_SECRET"
}

# Parse .env into a hashtable (split only on first '=' to preserve values with '=')
$envVars = @{}
foreach ($line in Get-Content $envPath) {
  if ($line -match "^\s*#") { continue }
  $idx = $line.IndexOf("=")
  if ($idx -lt 1) { continue }
  $key = $line.Substring(0, $idx).Trim()
  $value = $line.Substring($idx + 1)
  $envVars[$key] = $value.TrimEnd("`r", "`n", " ", "`t")
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

foreach ($secretName in $map.Keys) {
  $envName = $map[$secretName]
  if (-not $envVars.ContainsKey($envName)) {
    Write-Host "SKIP $secretName  (no $envName in .env)" -ForegroundColor Yellow
    continue
  }
  $value = $envVars[$envName]
  $tmp = [System.IO.Path]::GetTempFileName()
  # Write EXACT bytes, no trailing newline
  [System.IO.File]::WriteAllText($tmp, $value, $utf8NoBom)
  $len = (Get-Item $tmp).Length
  Write-Host "ADD  $secretName  <- $envName  ($len bytes)" -ForegroundColor Cyan
  gcloud secrets versions add $secretName --data-file=$tmp --project=$PROJECT | Out-Null
  Remove-Item $tmp -Force
}

Write-Host "`nDone. All 11 secrets have clean new versions." -ForegroundColor Green
Write-Host "A redeploy is required so Cloud Run picks up the new versions." -ForegroundColor Green
