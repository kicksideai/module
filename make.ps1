# SPDX-License-Identifier: MIT
# Windows adapter for this repository's Makefile targets.
# Run: powershell -NoProfile -File make.ps1 <target> [module-directory]
param(
    [Parameter(Position=0)]
    [ValidateSet('init', 'setup', 'check', 'build', 'dev', 'lint', 'typecheck', 'test-ui', 'test', 'test-pg', 'postgres-up', 'postgres-down', 'sync-handbook', 'check-handbook', 'verify', 'release-check', 'publish')]
    [string]$Target = 'verify',
    [string]$Organization,
    [string]$ModuleName,
    [string]$Title,
    [string]$Namespace,
    [string]$Tag,
    [string]$GitHubOwner,
    [string]$HandbookRef = 'main',
    [ValidateSet('private', 'public')][string]$Visibility = 'private',
    [string]$Version,
    [string]$Python,
    [Parameter(ValueFromRemainingArguments=$true)][string[]]$MakeArgs
)
$ErrorActionPreference = 'Stop'
$modulePath = (Resolve-Path -LiteralPath $PSScriptRoot).Path
if (-not (Test-Path -LiteralPath (Join-Path $modulePath 'Makefile') -PathType Leaf)) {
    throw "No owning Makefile in $modulePath"
}
$bash = 'C:/Progra~1/Git/bin/bash.exe'
if (-not (Test-Path -LiteralPath $bash -PathType Leaf)) { throw 'Install Git for Windows to run the Makefile shell recipes.' }
$make = (Get-Command make.exe -ErrorAction Stop).Source
$env:PATH = 'C:/Progra~1/Git/usr/bin;C:/Progra~1/Git/bin;' + $env:PATH
if ($env:WIPPY_BIN) {
    $wippyPath = (Resolve-Path -LiteralPath $env:WIPPY_BIN -ErrorAction Stop).Path
    $env:PATH = (Split-Path -Parent $wippyPath) + ';' + $env:PATH
}
# An explicit shell keeps native Windows make from falling back to cmd.exe.
# Make itself preserves each target's prerequisites, working folder and exit code.
if (-not $Python -and $Target -in @('check', 'verify', 'release-check')) {
    $Python = (Get-Command python.exe -ErrorAction Stop).Source
}
$variables = @("HANDBOOK_REF=$HandbookRef", "VIS=$Visibility")
if ($Python) { $variables += "PYTHON=$Python" }
if ($Target -eq 'init' -and (-not $Organization -or -not $ModuleName -or -not $Title)) {
    throw 'init requires -Organization, -ModuleName, and -Title'
}
foreach ($item in @(
    @('ORG', $Organization), @('MODULE_NAME', $ModuleName), @('TITLE', $Title),
    @('NAMESPACE', $Namespace), @('TAG', $Tag), @('GITHUB_OWNER', $GitHubOwner), @('VERSION', $Version)
)) {
    if ($item[1]) { $variables += "$($item[0])=$($item[1])" }
}
& $make -C $modulePath "SHELL=$bash" $Target @variables @MakeArgs
exit $LASTEXITCODE
