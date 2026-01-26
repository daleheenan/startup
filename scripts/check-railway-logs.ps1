# Railway Log Monitor
# Checks Railway deployment logs for errors and creates a report

param(
    [string]$ServiceId = "",
    [int]$Lines = 200,
    [switch]$Watch,
    [int]$WatchInterval = 60
)

function Get-RailwayLogs {
    param([int]$NumLines = 200)

    try {
        if ($ServiceId) {
            $logs = railway logs --service $ServiceId -n $NumLines 2>&1
        } else {
            $logs = railway logs -n $NumLines 2>&1
        }
        return $logs
    } catch {
        Write-Error "Failed to get Railway logs: $_"
        return $null
    }
}

function Analyze-Logs {
    param([string[]]$Logs)

    $errors = @()
    $warnings = @()
    $criticalPatterns = @(
        "SQLITE_ERROR",
        "no such table",
        "no such column",
        "ECONNREFUSED",
        "FATAL",
        "Error:",
        "error:",
        "500",
        "Migration failed",
        "Cannot find module",
        "TypeError",
        "ReferenceError",
        "SyntaxError"
    )

    $warningPatterns = @(
        "WARN",
        "warning",
        "deprecated",
        "retry"
    )

    foreach ($line in $Logs) {
        foreach ($pattern in $criticalPatterns) {
            if ($line -match $pattern) {
                $errors += $line
                break
            }
        }
        foreach ($pattern in $warningPatterns) {
            if ($line -match $pattern -and $line -notin $errors) {
                $warnings += $line
                break
            }
        }
    }

    return @{
        Errors = $errors | Select-Object -Unique
        Warnings = $warnings | Select-Object -Unique
    }
}

function Show-Report {
    param($Analysis)

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  RAILWAY LOG ANALYSIS REPORT" -ForegroundColor Cyan
    Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    Write-Host "========================================`n" -ForegroundColor Cyan

    if ($Analysis.Errors.Count -gt 0) {
        Write-Host "ERRORS FOUND: $($Analysis.Errors.Count)" -ForegroundColor Red
        Write-Host "----------------------------------------" -ForegroundColor Red
        foreach ($error in $Analysis.Errors | Select-Object -First 20) {
            Write-Host "  $error" -ForegroundColor Red
        }
        if ($Analysis.Errors.Count -gt 20) {
            Write-Host "  ... and $($Analysis.Errors.Count - 20) more" -ForegroundColor Red
        }
        Write-Host ""
    } else {
        Write-Host "NO ERRORS FOUND" -ForegroundColor Green
        Write-Host ""
    }

    if ($Analysis.Warnings.Count -gt 0) {
        Write-Host "WARNINGS: $($Analysis.Warnings.Count)" -ForegroundColor Yellow
        Write-Host "----------------------------------------" -ForegroundColor Yellow
        foreach ($warning in $Analysis.Warnings | Select-Object -First 10) {
            Write-Host "  $warning" -ForegroundColor Yellow
        }
        if ($Analysis.Warnings.Count -gt 10) {
            Write-Host "  ... and $($Analysis.Warnings.Count - 10) more" -ForegroundColor Yellow
        }
    }

    Write-Host "`n========================================"  -ForegroundColor Cyan
}

function Categorize-Errors {
    param([string[]]$Errors)

    $categories = @{
        "Database/Migration" = @()
        "Module/Import" = @()
        "Runtime" = @()
        "Network" = @()
        "Other" = @()
    }

    foreach ($error in $Errors) {
        if ($error -match "SQLITE|table|column|migration|database") {
            $categories["Database/Migration"] += $error
        } elseif ($error -match "Cannot find module|import|require") {
            $categories["Module/Import"] += $error
        } elseif ($error -match "TypeError|ReferenceError|undefined|null") {
            $categories["Runtime"] += $error
        } elseif ($error -match "ECONNREFUSED|timeout|network") {
            $categories["Network"] += $error
        } else {
            $categories["Other"] += $error
        }
    }

    return $categories
}

# Main execution
Write-Host "Fetching Railway logs..." -ForegroundColor Cyan

$logs = Get-RailwayLogs -NumLines $Lines

if (-not $logs) {
    Write-Host "Could not fetch logs. Make sure you're logged into Railway CLI." -ForegroundColor Red
    Write-Host "Run: railway login" -ForegroundColor Yellow
    exit 1
}

$analysis = Analyze-Logs -Logs $logs

Show-Report -Analysis $analysis

if ($analysis.Errors.Count -gt 0) {
    Write-Host "`nERROR CATEGORIES:" -ForegroundColor Cyan
    $categories = Categorize-Errors -Errors $analysis.Errors
    foreach ($category in $categories.Keys) {
        if ($categories[$category].Count -gt 0) {
            Write-Host "  $category`: $($categories[$category].Count) errors" -ForegroundColor Yellow
        }
    }

    Write-Host "`nSUGGESTED ACTIONS:" -ForegroundColor Cyan
    if ($categories["Database/Migration"].Count -gt 0) {
        Write-Host "  - Check backend/src/db/migrate.ts for missing migrations" -ForegroundColor White
        Write-Host "  - Verify all .sql files in migrations/ are registered" -ForegroundColor White
    }
    if ($categories["Module/Import"].Count -gt 0) {
        Write-Host "  - Run 'npm ci' to reinstall dependencies" -ForegroundColor White
        Write-Host "  - Check for missing package imports" -ForegroundColor White
    }
    if ($categories["Runtime"].Count -gt 0) {
        Write-Host "  - Check for null/undefined values in API responses" -ForegroundColor White
        Write-Host "  - Review recent code changes" -ForegroundColor White
    }
}

if ($Watch) {
    Write-Host "`nWatching for new errors (every $WatchInterval seconds)..." -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Gray

    while ($true) {
        Start-Sleep -Seconds $WatchInterval
        $newLogs = Get-RailwayLogs -NumLines 50
        $newAnalysis = Analyze-Logs -Logs $newLogs

        if ($newAnalysis.Errors.Count -gt 0) {
            Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] NEW ERRORS DETECTED!" -ForegroundColor Red
            foreach ($error in $newAnalysis.Errors | Select-Object -First 5) {
                Write-Host "  $error" -ForegroundColor Red
            }
        } else {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] No new errors" -ForegroundColor Green
        }
    }
}
