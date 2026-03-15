<#
.SYNOPSIS
  Rebuilds PDFs with pandoc and composes the final combined PDF with qpdf.

.PARAMETER Target
  One of: ProjectDescription | ProcessReport | ProjectReport | Generic | All | Combined

.PARAMETER File
  The markdown file to build when Target is Generic
#>

param(
  [ValidateSet("ProjectDescription","ProcessReport","ProjectReport","Generic","All","Combined")]
  [string]$Target = "All",
  [string]$File
)

$ErrorActionPreference = "Stop"

function Require-Tool($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing tool: $name not found in PATH."
  }
}

# Ensure deps
Require-Tool pandoc
Require-Tool qpdf

# cd to this script's folder (Documentation)
Set-Location -Path (Split-Path -Parent $MyInvocation.MyCommand.Path)

$FinalDir = Join-Path $PWD "Final"
if (-not (Test-Path $FinalDir)) { New-Item -ItemType Directory -Path $FinalDir | Out-Null }

function Build-Generic($mdFile) {
  if (-not $mdFile) { throw "File parameter required for Generic build" }
  $content = Get-Content $mdFile -Raw
  $charCount = $content.Length
  $wordCount = ($content -split '\s+').Where({$_ -ne ''}).Count
  $texContent = Get-Content "Styles\general.tex" -Raw
  $texContent = $texContent -replace '\$charcount\$', $charCount -replace '\$wordcount\$', $wordCount
  $tempTex = "temp-general.tex"
  $texContent | Out-File $tempTex -Encoding UTF8
  $baseName = [System.IO.Path]::GetFileNameWithoutExtension([System.IO.Path]::GetFileName($mdFile))
  pandoc --metadata-file="Styles\general-meta.yaml" $mdFile `
    --include-in-header="Styles\preamble.tex" `
    --include-in-header="Styles\general-hdr-ftr.tex" `
    --include-before-body=$tempTex `
    -V geometry:margin=25mm `
    --pdf-engine=pdflatex `
    --number-sections `
    -o "$FinalDir\$baseName.pdf"
  Remove-Item $tempTex
}

function Build-ProjectDescription {
  $content = Get-Content "ProjectDescription.md" -Raw
  $charCount = $content.Length
  $wordCount = ($content -split '\s+').Where({$_ -ne ''}).Count
  $texContent = Get-Content "Styles\ptd.tex" -Raw
  $texContent = $texContent -replace '\$charcount\$', $charCount -replace '\$wordcount\$', $wordCount
  $tempTex = "temp-ptd.tex"
  $texContent | Out-File $tempTex -Encoding UTF8
  pandoc --metadata-file="Styles\ptd-meta.yaml" "ProjectDescription.md" `
    --include-in-header="Styles\preamble.tex" `
    --include-in-header="Styles\ptd-hdr-ftr.tex" `
    --include-before-body=$tempTex `
    --include-before-body="Styles\toc.tex" `
    -V geometry:margin=25mm `
    --pdf-engine=pdflatex `
    --number-sections `
    -o "Final\ProjectDescription.pdf"
  Remove-Item $tempTex
}

function Build-ProcessReport {
  $content = Get-Content "ProcessReport.md" -Raw
  $charCount = $content.Length
  $wordCount = ($content -split '\s+').Where({$_ -ne ''}).Count
  $texContent = Get-Content "Styles\psr.tex" -Raw
  $texContent = $texContent -replace '\$charcount\$', $charCount -replace '\$wordcount\$', $wordCount
  $tempTex = "temp-psr.tex"
  $texContent | Out-File $tempTex -Encoding UTF8
  pandoc --metadata-file="Styles\psr-meta.yaml" "ProcessReport.md" `
    --include-in-header="Styles\preamble.tex" `
    --include-in-header="Styles\psr-hdr-ftr.tex" `
    --include-before-body=$tempTex `
    --include-before-body="Styles\toc.tex" `
    -V geometry:margin=25mm `
    --pdf-engine=pdflatex `
    --number-sections `
    -o "Final\ProcessReport.pdf"
  Remove-Item $tempTex
}

function Build-ProjectReport {
  $content = Get-Content "ProjectReport.md" -Raw
  $charCount = $content.Length
  $wordCount = ($content -split '\s+').Where({$_ -ne ''}).Count
  $texContent = Get-Content "Styles\ptr.tex" -Raw
  $texContent = $texContent -replace '\$charcount\$', $charCount -replace '\$wordcount\$', $wordCount
  $tempTex = "temp-ptr.tex"
  $texContent | Out-File $tempTex -Encoding UTF8
  pandoc --metadata-file="Styles\ptr-meta.yaml" "ProjectReport.md" `
    --include-in-header="Styles\preamble.tex" `
    --include-in-header="Styles\ptr-hdr-ftr.tex" `
    --include-before-body=$tempTex `
    --include-before-body="Styles\toc.tex" `
    -V geometry:margin=25mm `
    --pdf-engine=pdflatex `
    --number-sections `
    -o "Final\ProjectReport.pdf"
  Remove-Item $tempTex
}

function Build-Combined {
  $pd = "Final\ProjectDescription.pdf"
  $ps = "Final\ProcessReport.pdf"
  $pr = "Final\ProjectReport.pdf"
  foreach ($f in @($pd,$ps,$pr)) {
    if (-not (Test-Path $f)) { throw "Missing input for combined PDF: $f" }
  }
  qpdf --empty --pages $pd 1-z $ps 1-z $pr 1-z -- "Final\FinalDocument.pdf"
}

switch ($Target) {
  "ProjectDescription" { Build-ProjectDescription }
  "ProcessReport"      { Build-ProcessReport }
  "ProjectReport"      { Build-ProjectReport }
  "Combined"           { Build-Combined }
  "All" {
    Build-ProjectDescription
    Build-ProcessReport
    Build-ProjectReport
    Build-Combined
  }
  "Generic" {
    Build-Generic $File
  }
}
Write-Host "Done: $Target"