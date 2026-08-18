param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\assets")
)

Add-Type -AssemblyName System.Drawing

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($resolvedOutput) | Out-Null

function New-Canvas {
  param([int]$Width, [int]$Height)
  $bitmap = New-Object System.Drawing.Bitmap($Width, $Height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Save-Canvas {
  param($Canvas, [string]$Path)
  $Canvas.Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $Canvas.Graphics.Dispose()
  $Canvas.Bitmap.Dispose()
}

function Draw-Mosaic {
  param(
    [System.Drawing.Graphics]$Graphics,
    [int]$X,
    [int]$Y,
    [int]$Columns,
    [int]$Rows,
    [int]$Cell,
    [int]$Gap = 0
  )

  $neutral = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 210, 210, 206))
  $accent = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 224, 48, 48))
  $dark = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 31, 31, 29))

  for ($column = 0; $column -lt $Columns; $column++) {
    for ($row = 0; $row -lt $Rows; $row++) {
      $hash = (($column * 37) + ($row * 61) + (($column * $row) * 7)) % 17
      if ($hash -in @(0, 2, 5, 9, 13)) {
        $brush = if ((($column * 3 + $row * 5) % 7) -eq 0) { $accent } elseif ($hash -eq 13) { $dark } else { $neutral }
        $left = $X + ($column * $Cell)
        $top = $Y + ($row * $Cell)
        $size = [Math]::Max(1, $Cell - $Gap)
        $Graphics.FillRectangle($brush, $left, $top, $size, $size)
      }
    }
  }

  $neutral.Dispose()
  $accent.Dispose()
  $dark.Dispose()
}

# 128 × 128 Community icon
$icon = New-Canvas -Width 128 -Height 128
$iconBackground = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 250, 249, 245))
$icon.Graphics.FillRectangle($iconBackground, 0, 0, 128, 128)
$iconBackground.Dispose()
Draw-Mosaic -Graphics $icon.Graphics -X 12 -Y 12 -Columns 8 -Rows 8 -Cell 13 -Gap 2
$iconBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 31, 31, 29), 4)
$icon.Graphics.DrawRectangle($iconBorder, 2, 2, 123, 123)
$iconBorder.Dispose()
Save-Canvas -Canvas $icon -Path (Join-Path $resolvedOutput "plugin-icon-128.png")

# 1920 × 1080 Figma Community cover
$cover = New-Canvas -Width 1920 -Height 1080
$coverBackground = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 250, 249, 245))
$cover.Graphics.FillRectangle($coverBackground, 0, 0, 1920, 1080)
$coverBackground.Dispose()

$eyebrowFont = New-Object System.Drawing.Font("Segoe UI", 30, [System.Drawing.FontStyle]::Bold)
$titleFont = New-Object System.Drawing.Font("Segoe UI", 112, [System.Drawing.FontStyle]::Bold)
$bodyFont = New-Object System.Drawing.Font("Segoe UI", 36, [System.Drawing.FontStyle]::Regular)
$darkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 31, 31, 29))
$mutedBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 98, 98, 92))
$accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 224, 48, 48))

$cover.Graphics.DrawString("FIGMA PLUGIN", $eyebrowFont, $accentBrush, 140, 220)
$cover.Graphics.DrawString("Block`nMosaic", $titleFont, $darkBrush, 130, 300)
$cover.Graphics.DrawString("Repeatable geometric patterns,`nready to edit.", $bodyFont, $mutedBrush, 145, 670)

$panelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
$cover.Graphics.FillRectangle($panelBrush, 1010, 100, 780, 880)
$panelBrush.Dispose()
Draw-Mosaic -Graphics $cover.Graphics -X 1050 -Y 140 -Columns 14 -Rows 16 -Cell 50 -Gap 3

$eyebrowFont.Dispose()
$titleFont.Dispose()
$bodyFont.Dispose()
$darkBrush.Dispose()
$mutedBrush.Dispose()
$accentBrush.Dispose()
Save-Canvas -Canvas $cover -Path (Join-Path $resolvedOutput "community-cover-1920x1080.png")

# 1280 × 640 GitHub social preview
$social = New-Canvas -Width 1280 -Height 640
$socialBackground = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 31, 31, 29))
$social.Graphics.FillRectangle($socialBackground, 0, 0, 1280, 640)
$socialBackground.Dispose()

$socialTitle = New-Object System.Drawing.Font("Segoe UI", 74, [System.Drawing.FontStyle]::Bold)
$socialBody = New-Object System.Drawing.Font("Segoe UI", 26, [System.Drawing.FontStyle]::Regular)
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 250, 249, 245))
$socialMuted = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 194, 194, 188))
$social.Graphics.DrawString("Block Mosaic", $socialTitle, $whiteBrush, 74, 200)
$social.Graphics.DrawString("A deterministic pattern generator for Figma", $socialBody, $socialMuted, 82, 310)
Draw-Mosaic -Graphics $social.Graphics -X 830 -Y 48 -Columns 9 -Rows 10 -Cell 55 -Gap 4
$socialTitle.Dispose()
$socialBody.Dispose()
$whiteBrush.Dispose()
$socialMuted.Dispose()
Save-Canvas -Canvas $social -Path (Join-Path $resolvedOutput "github-social-preview-1280x640.png")

Write-Output "Generated Community assets in $resolvedOutput"
