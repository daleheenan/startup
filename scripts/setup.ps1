# Claude Code Project Setup Script (PowerShell)
# This script copies Claude agents, commands, and configurations to a target project

param(
    [string]$TargetDir = "."
)

# Get the directory where this script lives
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$StartupDir = Split-Path -Parent $ScriptDir

# Resolve target to absolute path
$TargetDir = Resolve-Path $TargetDir -ErrorAction SilentlyContinue
if (-not $TargetDir) {
    Write-Host "Error: Target directory does not exist" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "  Claude Code Project Setup" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""
Write-Host "Source:  " -NoNewline; Write-Host $StartupDir -ForegroundColor Yellow
Write-Host "Target:  " -NoNewline; Write-Host $TargetDir -ForegroundColor Yellow
Write-Host ""

# Check if target already has .claude directory
if (Test-Path "$TargetDir\.claude") {
    Write-Host "Warning: Target already has a .claude directory" -ForegroundColor Yellow
    $response = Read-Host "Merge files? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "Aborted" -ForegroundColor Red
        exit 1
    }
}

# Create directories
Write-Host "Creating directories..." -ForegroundColor Green
New-Item -ItemType Directory -Force -Path "$TargetDir\.claude\agents" | Out-Null
New-Item -ItemType Directory -Force -Path "$TargetDir\.claude\commands" | Out-Null

# Copy agents
Write-Host "Copying agents..." -ForegroundColor Green
$AgentCount = 0
Get-ChildItem "$StartupDir\.claude\agents\*.md" | ForEach-Object {
    $filename = $_.Name
    $targetFile = "$TargetDir\.claude\agents\$filename"
    if (Test-Path $targetFile) {
        Write-Host "  Skipping " -NoNewline; Write-Host $filename -ForegroundColor Yellow -NoNewline; Write-Host " (already exists)"
    } else {
        Copy-Item $_.FullName $targetFile
        Write-Host "  Added " -NoNewline; Write-Host $filename -ForegroundColor Green
        $AgentCount++
    }
}

# Copy commands
Write-Host "Copying commands..." -ForegroundColor Green
$CommandCount = 0
Get-ChildItem "$StartupDir\.claude\commands\*.md" -ErrorAction SilentlyContinue | ForEach-Object {
    $filename = $_.Name
    $targetFile = "$TargetDir\.claude\commands\$filename"
    if (Test-Path $targetFile) {
        Write-Host "  Skipping " -NoNewline; Write-Host $filename -ForegroundColor Yellow -NoNewline; Write-Host " (already exists)"
    } else {
        Copy-Item $_.FullName $targetFile
        Write-Host "  Added " -NoNewline; Write-Host $filename -ForegroundColor Green
        $CommandCount++
    }
}

# Copy CLAUDE.md if it exists and target doesn't have one
if ((Test-Path "$StartupDir\CLAUDE.md") -and (-not (Test-Path "$TargetDir\CLAUDE.md"))) {
    Write-Host "Copying CLAUDE.md..." -ForegroundColor Green
    Copy-Item "$StartupDir\CLAUDE.md" "$TargetDir\"
    Write-Host "  Added " -NoNewline; Write-Host "CLAUDE.md" -ForegroundColor Green
}

# Check .gitignore
if (Test-Path "$TargetDir\.gitignore") {
    $gitignore = Get-Content "$TargetDir\.gitignore" -Raw
    if ($gitignore -match "^\.claude") {
        Write-Host ""
        Write-Host "Note: .claude/ is in .gitignore" -ForegroundColor Yellow
        Write-Host "To track agents in git, remove '.claude/' from .gitignore"
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Added: $AgentCount agents, $CommandCount commands"
Write-Host ""
Write-Host "Available commands:"
Write-Host "  /feature-workflow - Full feature development cycle"
Write-Host ""
Write-Host "Available agents:"
Get-ChildItem "$TargetDir\.claude\agents\*.md" | ForEach-Object {
    Write-Host "  - $($_.BaseName)"
}
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
