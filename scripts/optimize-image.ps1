param(
  [Parameter(Mandatory=$true)][string]$Source,
  [Parameter(Mandatory=$true)][string]$Destination,
  [int]$MaxWidth = 1800,
  [int]$Quality = 86
)

Add-Type -AssemblyName System.Drawing
$image = [System.Drawing.Image]::FromFile($Source)
try {
  $scale = [Math]::Min(1.0, [double]$MaxWidth / [double]$image.Width)
  $width = [Math]::Max(1, [int]($image.Width * $scale))
  $height = [Math]::Max(1, [int]($image.Height * $scale))
  $bitmap = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.Clear([System.Drawing.Color]::White)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($image, 0, 0, $width, $height)
    [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($Destination)) | Out-Null
    $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $parameters = New-Object System.Drawing.Imaging.EncoderParameters 1
    $parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]$Quality)
    $bitmap.Save($Destination, $encoder, $parameters)
  } finally { $graphics.Dispose(); $bitmap.Dispose() }
} finally { $image.Dispose() }
