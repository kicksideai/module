param(
    [Parameter(Position = 0)]
    [ValidateSet('init', 'setup', 'check', 'build', 'dev', 'lint', 'typecheck', 'test-ui', 'test', 'test-pg', 'postgres-up', 'postgres-down', 'sync-handbook', 'check-handbook', 'verify', 'release-check', 'publish')]
    [string]$Target = 'verify',
    [string]$Organization,
    [string]$ModuleName,
    [string]$Title,
    [string]$Namespace,
    [string]$Tag,
    [string]$GitHubOwner,
    [string]$HandbookRef = 'main',
    [ValidateSet('private', 'public')]
    [string]$Visibility = 'private',
    [string]$Version
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Version) {
    $Version = (Get-Content (Join-Path $Root '.release-please-manifest.json') -Raw | ConvertFrom-Json).'.'
}

function Invoke-Checked {
    param([string]$Command, [string[]]$Arguments, [string]$Directory = $Root)
    Push-Location $Directory
    try {
        & $Command @Arguments
        if ($LASTEXITCODE -ne 0) { throw "$Command failed with exit code $LASTEXITCODE" }
    } finally {
        Pop-Location
    }
}

function Invoke-Init {
    if (-not $Organization -or -not $ModuleName -or -not $Title) {
        throw 'init requires -Organization, -ModuleName, and -Title'
    }
    $args = @('scripts/init-module.mjs', '--organization', $Organization, '--module', $ModuleName, '--title', $Title)
    if ($Namespace) { $args += @('--namespace', $Namespace) }
    if ($Tag) { $args += @('--tag', $Tag) }
    if ($GitHubOwner) { $args += @('--github-owner', $GitHubOwner) }
    Invoke-Checked node $args
}

function Invoke-Setup {
    Invoke-Checked wippy @('update')
    Invoke-Checked wippy @('update') (Join-Path $Root 'test')
    Invoke-Checked npm @('--prefix', 'ui', 'ci')
}

function Invoke-Check {
    Invoke-Checked node @('scripts/check-module.mjs')
    Invoke-Checked node @('scripts/test-initializer.mjs')
}

function Invoke-Build { Invoke-Checked npm @('--prefix', 'ui', 'run', 'build') }
function Invoke-Lint { Invoke-Checked wippy @('lint') }
function Invoke-Typecheck { Invoke-Checked npm @('--prefix', 'ui', 'run', 'type-check') }
# The runner exits 0 when it discovers zero tests, which turns a broken
# discovery setup into a false-green run; mirror the Makefile guard.
function Invoke-TestRunner {
    param([string[]]$Arguments)
    Push-Location (Join-Path $Root 'test')
    try {
        $output = & wippy @Arguments 2>&1 | ForEach-Object { "$_" }
        $output | Write-Host
        if ($LASTEXITCODE -ne 0) { throw "wippy failed with exit code $LASTEXITCODE" }
        if ($output -match 'No tests found') { throw 'test runner discovered no tests' }
    } finally {
        Pop-Location
    }
}
function Invoke-TestUi { Invoke-Checked npm @('--prefix', 'ui', 'test') }
function Invoke-Test { Invoke-TestRunner @('test') }
function Invoke-TestPg { Invoke-TestRunner @('test', '--profile', 'postgres') }
function Invoke-Verify {
    Invoke-Setup
    Invoke-Check
    Invoke-Lint
    Invoke-Typecheck
    Invoke-Build
    Invoke-TestUi
    Invoke-Test
}
function Invoke-SyncHandbook {
    Invoke-Checked node @('scripts/sync-handbook.mjs', '--ref', $HandbookRef)
}
function Invoke-CheckHandbook {
    Invoke-Checked node @('scripts/sync-handbook.mjs', '--check', '--ref', $HandbookRef)
}

switch ($Target) {
    'init' { Invoke-Init }
    'setup' { Invoke-Setup }
    'check' { Invoke-Check }
    'build' { Invoke-Build }
    'dev' { Invoke-Checked npm @('--prefix', 'ui', 'run', 'dev') }
    'lint' { Invoke-Lint }
    'typecheck' { Invoke-Typecheck }
    'test-ui' { Invoke-TestUi }
    'test' { Invoke-Test }
    'test-pg' { Invoke-TestPg }
    'postgres-up' { Invoke-Checked docker @('compose', '-f', 'compose.test.yaml', 'up', '-d', '--wait') }
    'postgres-down' { Invoke-Checked docker @('compose', '-f', 'compose.test.yaml', 'down', '-v') }
    'sync-handbook' { Invoke-SyncHandbook }
    'check-handbook' { Invoke-CheckHandbook }
    'verify' { Invoke-Verify }
    'release-check' {
        Invoke-Verify
        Invoke-Checked wippy @('auth', 'status')
        Invoke-Checked wippy @('publish', '--version', $Version, '--dry-run', '--create', '--module-visibility', $Visibility, '--module-type', 'plugin', '--embed', 'ui_fs')
    }
    'publish' {
        Invoke-Verify
        Invoke-Checked wippy @('auth', 'status')
        Invoke-Checked wippy @('publish', '--version', $Version, '--dry-run', '--create', '--module-visibility', $Visibility, '--module-type', 'plugin', '--embed', 'ui_fs')
        Invoke-Checked wippy @('publish', '--version', $Version, '--create', '--module-visibility', $Visibility, '--module-type', 'plugin', '--embed', 'ui_fs')
    }
}
