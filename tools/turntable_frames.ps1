# Turntable frames: raw renders -> the small frames a turntable loads.
# Windows PowerShell + .NET's System.Drawing (built in; nothing to install).
#
# Usage (from the repo root, in PowerShell):
#   .\tools\turntable_frames.ps1 -Page content\projects\vis\bgi-seaport-square
#
# Reads   <Page>\img\_raw\turntable\phase_<id>\phase_<id>_base_00000.jpg   (gitignored)
#                                              phase_<id>_color_00000.jpg
# Writes  <Page>\img\turntable\phase_<id>\base_00_640.jpg   render at each of -Widths, smooth, JPG
#                                         base_00_1024.jpg  (the turntable picks one size per screen)
#                                         color_00.png      ID pass, -ColorWidth wide, PNG
#         <Page>\img\thumb_800.jpg, thumb_1280.jpg       card thumb: the last phase's frame 0
#
# The ID pass is scaled nearest-neighbor and saved as PNG, so each
# building keeps one exact color: smoothing would blend two buildings'
# colors at their shared edge into a third that matches neither.
# Phases are the phase_* folders, in name order. Re-running overwrites.
#   -Source <folder>  read the raw phase_* folders from somewhere else
#   -Widths 640       write only some sizes (the list must match `sizes`
#                     in TURNTABLE_DEFAULTS, content/helpers.js)
param(
  [Parameter(Mandatory)] [string]$Page,
  [string]$Source,
  [int[]]$Widths = @(640, 1024),
  [int]$ColorWidth = 512,
  [int]$Quality = 78
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$src = if ($Source) { $Source } else { Join-Path $Page 'img\_raw\turntable' }
$out = Join-Path $Page 'img\turntable'
if (-not (Test-Path $src)) { throw "No raw frames at $src" }
$jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }

# Resize one image. $smooth: bicubic + JPG (renders); else nearest + PNG (ID pass)
function Save-Resized($inPath, $outPath, $width, $smooth) {
  $img = [System.Drawing.Image]::FromFile((Resolve-Path $inPath))
  $height = [int]($img.Height * $width / $img.Width)
  $bmp = New-Object System.Drawing.Bitmap $width, $height
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = if ($smooth) { 'HighQualityBicubic' } else { 'NearestNeighbor' }
  $g.PixelOffsetMode = 'Half'
  $g.DrawImage($img, 0, 0, $width, $height)
  $full = [System.IO.Path]::GetFullPath($outPath)
  if ($smooth) {
    $params = New-Object System.Drawing.Imaging.EncoderParameters 1
    $params.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
    $bmp.Save($full, $jpeg, $params)
  } else {
    $bmp.Save($full, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  $g.Dispose(); $bmp.Dispose(); $img.Dispose()
}

$phases = Get-ChildItem $src -Directory -Filter 'phase_*' | Sort-Object Name
if (-not $phases) { throw "No phase_* folders in $src" }

foreach ($phase in $phases) {
  $dir = Join-Path $out $phase.Name
  New-Item -ItemType Directory -Force $dir | Out-Null
  $bases = Get-ChildItem $phase.FullName -Filter "$($phase.Name)_base_*.jpg" | Sort-Object Name
  $i = 0
  foreach ($file in $bases) {
    $n = '{0:D2}' -f $i
    foreach ($w in $Widths) { Save-Resized $file.FullName (Join-Path $dir "base_${n}_$w.jpg") $w $true }
    $color = $file.FullName -replace '_base_', '_color_'
    if (Test-Path $color) { Save-Resized $color (Join-Path $dir "color_$n.png") $ColorWidth $false }
    $i++
  }
  Write-Output "$($phase.Name): $i frames"
}

# Card thumb: the full build-out from the first angle
$last = $phases[-1]
$first = Get-ChildItem $last.FullName -Filter "$($last.Name)_base_*.jpg" | Sort-Object Name | Select-Object -First 1
foreach ($w in 800, 1280) { Save-Resized $first.FullName (Join-Path $Page "img\thumb_$w.jpg") $w $true }
Write-Output "thumb: img\thumb_800.jpg, thumb_1280.jpg"
