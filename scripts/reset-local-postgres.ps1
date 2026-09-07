$ErrorActionPreference = 'Stop'

$projectRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$resultFile = Join-Path $projectRoot 'postgres-reset-result.txt'
$envFile = Join-Path $projectRoot '.env.local'

try {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'This reset must be run with Administrator permission.'
  }

  $databaseLine = Get-Content -LiteralPath $envFile |
    Where-Object { $_ -match '^DATABASE_URI=' } |
    Select-Object -First 1
  if (-not $databaseLine) { throw 'DATABASE_URI is missing from .env.local.' }

  $databaseUri = [Uri]$databaseLine.Substring('DATABASE_URI='.Length).Trim()
  $credentials = $databaseUri.UserInfo.Split(':', 2)
  if ($credentials.Count -ne 2) { throw 'DATABASE_URI must include a username and password.' }
  $databaseUser = [Uri]::UnescapeDataString($credentials[0])
  $databasePassword = [Uri]::UnescapeDataString($credentials[1])
  if ($databaseUser -notmatch '^[a-zA-Z_][a-zA-Z0-9_]{0,62}$') { throw 'Unsafe PostgreSQL role name.' }
  if (-not $databasePassword) { throw 'The configured PostgreSQL password is empty.' }

  $serviceName = 'postgresql-x64-16'
  $serviceKey = "HKLM:\SYSTEM\CurrentControlSet\Services\$serviceName"
  $imagePath = (Get-ItemProperty -LiteralPath $serviceKey -Name ImagePath).ImagePath
  $dataMatch = [regex]::Match($imagePath, '-D\s+"([^"]+)"')
  if (-not $dataMatch.Success) { throw 'Unable to resolve the PostgreSQL data directory.' }

  $dataDirectory = [System.IO.Path]::GetFullPath($dataMatch.Groups[1].Value)
  $expectedRoot = [System.IO.Path]::GetFullPath('C:\Program Files\PostgreSQL\16')
  if (-not $dataDirectory.StartsWith($expectedRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Unexpected PostgreSQL data directory: $dataDirectory"
  }

  $hbaFile = Join-Path $dataDirectory 'pg_hba.conf'
  $psql = Join-Path $expectedRoot 'bin\psql.exe'
  if (-not (Test-Path -LiteralPath $hbaFile -PathType Leaf)) { throw "Missing $hbaFile" }
  if (-not (Test-Path -LiteralPath $psql -PathType Leaf)) { throw "Missing $psql" }

  $originalBytes = [System.IO.File]::ReadAllBytes($hbaFile)
  $originalHash = (Get-FileHash -LiteralPath $hbaFile -Algorithm SHA256).Hash
  $backupFile = "$hbaFile.codex-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  [System.IO.File]::WriteAllBytes($backupFile, $originalBytes)
  $temporaryRulesWritten = $false

  try {
    Stop-Service -Name $serviceName -Force
    (Get-Service -Name $serviceName).WaitForStatus('Stopped', [TimeSpan]::FromSeconds(30))

    $rules = [System.IO.File]::ReadAllLines($hbaFile)
    $changedRules = 0
    for ($index = 0; $index -lt $rules.Length; $index += 1) {
      if ($rules[$index] -match '^\s*host\s+all\s+all\s+(127\.0\.0\.1/32|::1/128)\s+scram-sha-256\s*$') {
        $rules[$index] = $rules[$index] -replace 'scram-sha-256\s*$', 'trust'
        $changedRules += 1
      }
    }
    if ($changedRules -ne 2) { throw "Expected two localhost SCRAM rules; found $changedRules." }
    [System.IO.File]::WriteAllLines($hbaFile, $rules, [Text.UTF8Encoding]::new($false))
    $temporaryRulesWritten = $true

    Start-Service -Name $serviceName
    (Get-Service -Name $serviceName).WaitForStatus('Running', [TimeSpan]::FromSeconds(30))

    $escapedPassword = $databasePassword.Replace("'", "''")
    & $psql -w -h 127.0.0.1 -p $databaseUri.Port -U $databaseUser -d postgres -v ON_ERROR_STOP=1 -c "ALTER ROLE `"$databaseUser`" WITH PASSWORD '$escapedPassword';"
    if ($LASTEXITCODE -ne 0) { throw "ALTER ROLE failed with exit code $LASTEXITCODE." }
  }
  finally {
    if ($temporaryRulesWritten) {
      $service = Get-Service -Name $serviceName
      if ($service.Status -ne 'Stopped') {
        Stop-Service -Name $serviceName -Force
        $service.WaitForStatus('Stopped', [TimeSpan]::FromSeconds(30))
      }
      [System.IO.File]::WriteAllBytes($hbaFile, $originalBytes)
      if ((Get-FileHash -LiteralPath $hbaFile -Algorithm SHA256).Hash -ne $originalHash) {
        throw 'Original pg_hba.conf restoration could not be verified.'
      }
      Start-Service -Name $serviceName
      (Get-Service -Name $serviceName).WaitForStatus('Running', [TimeSpan]::FromSeconds(30))
    }
  }

  $env:PGPASSWORD = $databasePassword
  & $psql -w -h 127.0.0.1 -p $databaseUri.Port -U $databaseUser -d postgres -v ON_ERROR_STOP=1 -c 'SELECT current_user AS verified_user;'
  $verificationExit = $LASTEXITCODE
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  if ($verificationExit -ne 0) { throw 'The new PostgreSQL password did not pass verification.' }

  "PASS`nPostgreSQL role password reset and SCRAM authentication restored.`nBackup: $backupFile" |
    Set-Content -LiteralPath $resultFile -Encoding UTF8
  exit 0
}
catch {
  "FAIL`n$($_.Exception.Message)" | Set-Content -LiteralPath $resultFile -Encoding UTF8
  Write-Error $_
  exit 1
}
