<#
.SYNOPSIS
  Read and harden the Firebase Auth sign-in providers for aiwebatelier-spine.

.DESCRIPTION
  Firebase Auth provider config lives behind the Identity Toolkit Admin API
  (identitytoolkit.googleapis.com/admin/v2), so it can be driven from a script
  instead of clicking through the Console.

  WHAT THIS SCRIPT DOES
    -Status              show which providers are on right now
    -DisableAnonymous    turn anonymous sign-in OFF   <- closes the spend hole
    -EnableGoogle        turn Google sign-in ON (needs -ClientId/-ClientSecret)

  WHAT IT CANNOT DO, AND WHY
    1. Create the Google OAuth 2.0 client. The API requires an existing
       clientId/clientSecret; creating OAuth clients is not publicly
       API-exposed. The Firebase Console creates one for you the first time you
       flip Google on — do that once, then this script can manage it forever.
    2. Upgrade the project to Identity Platform. That is a Console/Marketplace
       action, and it is what makes the beforeUserCreated / beforeUserSignedIn
       blocking functions actually fire.

  Neither gap weakens the gate: requireAdmin() in functions/src/fire.ts is the
  enforcement point and it works regardless.

.PREREQUISITES
  gcloud on this machine defaults to an account with NO access to this project.
  Check before you run anything:

    gcloud auth list
    gcloud config set account <your-aiwebatelier-account>
    gcloud config set project aiwebatelier-spine

  The account needs firebaseauth.configs.get / .update (Firebase Authentication
  Admin, or Owner).

.EXAMPLE
  ./configure-auth.ps1 -Status
  ./configure-auth.ps1 -DisableAnonymous
  ./configure-auth.ps1 -EnableGoogle -ClientId '...' -ClientSecret '...'
#>

[CmdletBinding()]
param(
  [string]$Project = 'aiwebatelier-spine',
  [switch]$Status,
  [switch]$DisableAnonymous,
  [switch]$EnableGoogle,
  [string]$ClientId,
  [string]$ClientSecret
)

$ErrorActionPreference = 'Stop'
$base = "https://identitytoolkit.googleapis.com/admin/v2/projects/$Project"

function Get-Token {
  $account = (& gcloud config get-value account 2>$null)
  if (-not $account -or $account -eq '(unset)') {
    throw 'No active gcloud account. Run: gcloud auth login'
  }
  Write-Host "gcloud account : $account" -ForegroundColor DarkGray

  $token = (& gcloud auth print-access-token 2>$null)
  if (-not $token) { throw 'Could not mint an access token. Run: gcloud auth login' }
  return $token
}

function Invoke-Idp {
  param([string]$Method, [string]$Url, $Body)

  $headers = @{
    Authorization  = "Bearer $(Get-Token)"
    'Content-Type' = 'application/json'
  }
  try {
    if ($null -ne $Body) {
      $json = $Body | ConvertTo-Json -Depth 10 -Compress
      return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -Body $json
    }
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers
  }
  catch {
    $resp = $_.Exception.Response
    if ($resp -and $resp.StatusCode.value__ -eq 403) {
      throw "403 from Identity Toolkit. The active gcloud account almost certainly lacks access to '$Project'. Run 'gcloud config set account <...>' and retry. Original: $($_.Exception.Message)"
    }
    throw
  }
}

function Show-Status {
  $cfg = Invoke-Idp -Method GET -Url "${base}/config"
  $anon = $cfg.signIn.anonymous.enabled -eq $true
  $email = $cfg.signIn.email.enabled -eq $true

  Write-Host ''
  Write-Host "Project : $Project"
  Write-Host ("Anonymous sign-in : {0}" -f $(if ($anon) { 'ENABLED  <-- anyone can call your functions' } else { 'disabled' })) `
    -ForegroundColor $(if ($anon) { 'Red' } else { 'Green' })
  Write-Host ("Email/password    : {0}" -f $(if ($email) { 'enabled' } else { 'disabled' }))

  try {
    $idps = Invoke-Idp -Method GET -Url "${base}/defaultSupportedIdpConfigs"
    $google = $idps.defaultSupportedIdpConfigs | Where-Object { $_.name -like '*google.com' }
    $on = $google -and $google.enabled -eq $true
    Write-Host ("Google sign-in    : {0}" -f $(if ($on) { 'enabled' } else { 'NOT enabled' })) `
      -ForegroundColor $(if ($on) { 'Green' } else { 'Yellow' })
  }
  catch {
    Write-Host 'Google sign-in    : could not read (no IdP configs yet)' -ForegroundColor Yellow
  }
  Write-Host ''
}

# ── main ────────────────────────────────────────────────────────────────────

if (-not ($Status -or $DisableAnonymous -or $EnableGoogle)) {
  Write-Host 'Nothing to do. Pass -Status, -DisableAnonymous or -EnableGoogle.'
  exit 1
}

if ($Status) { Show-Status }

if ($DisableAnonymous) {
  Write-Host ''
  Write-Warning 'Disabling anonymous sign-in will sign out every existing anonymous session.'
  Write-Warning 'Capture the anonymous uid FIRST (Console -> Authentication -> Users) — you need it'
  Write-Warning 'for scripts/../functions/scripts/reparent-uid.mjs, and disabling hides those rows.'
  $answer = Read-Host 'Type YES to continue'
  if ($answer -ne 'YES') { Write-Host 'Aborted.'; exit 1 }

  Invoke-Idp -Method PATCH `
    -Url "${base}/config?updateMask=signIn.anonymous.enabled" `
    -Body @{ signIn = @{ anonymous = @{ enabled = $false } } } | Out-Null

  Write-Host 'Anonymous sign-in disabled.' -ForegroundColor Green
  Show-Status
}

if ($EnableGoogle) {
  if (-not $ClientId -or -not $ClientSecret) {
    throw 'EnableGoogle needs -ClientId and -ClientSecret. Get them from GCP Console -> APIs & Services -> Credentials (or flip Google on once in the Firebase Console, which creates the client for you).'
  }

  $body = @{ enabled = $true; clientId = $ClientId; clientSecret = $ClientSecret }

  try {
    Invoke-Idp -Method POST `
      -Url "${base}/defaultSupportedIdpConfigs?idpId=google.com" `
      -Body $body | Out-Null
    Write-Host 'Google sign-in enabled.' -ForegroundColor Green
  }
  catch {
    # Already exists -> PATCH instead of POST.
    Invoke-Idp -Method PATCH `
      -Url "${base}/defaultSupportedIdpConfigs/google.com?updateMask=enabled,clientId,clientSecret" `
      -Body $body | Out-Null
    Write-Host 'Google sign-in updated.' -ForegroundColor Green
  }

  Show-Status
}
