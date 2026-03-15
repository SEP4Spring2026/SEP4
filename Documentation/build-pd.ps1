<#
.SYNOPSIS
  Rebuilds only the Project Description PDF using Pandoc.
#>

$ErrorActionPreference = "Stop"

# Check for Pandoc
if (-not (Get-Command pandoc -ErrorAction SilentlyContinue)) {
    throw "Missing tool: pandoc not found in PATH."
}

# Set location to the script's folder
Set-Location -Path (Split-Path -Parent $MyInvocation.MyCommand.Path)

# Ensure 'Final' directory exists
$FinalDir = Join-Path $PWD "Final"
if (-not (Test-Path $FinalDir)) { New-Item -ItemType Directory -Path $FinalDir | Out-Null }

Write-Host "Building Project Description..."

# 1. Calculate word/char counts from the markdown file
$content = Get-Content "ProjectDescription.md" -Raw
$charCount = $content.Length
$wordCount = ($content -split '\s+').Where({$_ -ne ''}).Count

# 2. Update the LaTeX front page (ptd.tex) with current counts
$texContent = Get-Content "Styles\ptd.tex" -Raw
$texContent = $texContent -replace '\$charcount\$', $charCount -replace '\$wordcount\$', $wordCount

# 3. Save to a temporary file for the build process
$tempTex = "temp-ptd.tex"
$texContent | Out-File $tempTex -Encoding UTF8

# 4. Run Pandoc
# Note: Ensure the files in 'Styles\' exist as referenced
pandoc --metadata-file="Styles\ptd-meta.yaml" "ProjectDescription.md" `
    --include-in-header="Styles\preamble.tex" `
    --include-in-header="Styles\ptd-hdr-ftr.tex" `
    --include-before-body=$tempTex `
    --include-before-body="Styles\toc.tex" `
    -V geometry:margin=25mm `
    --pdf-engine=xelatex `
    --number-sections `
    -o "Final\ProjectDescription.pdf"

# 5. Cleanup
Remove-Item $tempTex

Write-Host "Done! File saved in Final\ProjectDescription.pdf"