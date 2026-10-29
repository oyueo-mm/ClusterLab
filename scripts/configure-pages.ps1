param([switch]$Enable)
$ErrorActionPreference = 'Stop'
$env:GCM_INTERACTIVE = 'never'
$credentialLines = @('protocol=https','host=github.com','') | git credential fill
if ($LASTEXITCODE -ne 0) { throw 'GitHub credential manager authentication is unavailable.' }
$password = $null
foreach ($line in $credentialLines) {
    if ($line.StartsWith('password=')) { $password = $line.Substring(9) }
}
if (-not $password) { throw 'No stored GitHub credential. No secrets were printed.' }
$headers = @{ Authorization = "Bearer $password"; Accept = 'application/vnd.github+json'; 'X-GitHub-Api-Version' = '2022-11-28'; 'User-Agent' = 'ClusterLab-setup' }
$uri = 'https://api.github.com/repos/oyueo-mm/ClusterLab/pages'
try {
    $result = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
} catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 404 -or -not $Enable) { throw }
    $result = Invoke-RestMethod -Uri $uri -Headers $headers -Method Post -ContentType 'application/json' -Body '{"build_type":"workflow"}'
}
if ($Enable -and $result.build_type -ne 'workflow') {
    $result = Invoke-RestMethod -Uri $uri -Headers $headers -Method Put -ContentType 'application/json' -Body '{"build_type":"workflow"}'
}
[pscustomobject]@{ url = $result.html_url; build_type = $result.build_type; status = $result.status } | ConvertTo-Json -Compress
$password = $null
$credentialLines = $null
$headers = $null
