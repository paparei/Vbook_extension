$zipPath = "$PSScriptRoot\anime47\plugin.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Add-Type -AssemblyName System.IO.Compression

$fs = [System.IO.File]::Create($zipPath)
$archive = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)

function Add-FileToZip($filePath, $entryName) {
    $entry = $archive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
    $entryStream = $entry.Open()
    $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
    $entryStream.Write($fileBytes, 0, $fileBytes.Length)
    $entryStream.Flush()
    $entryStream.Close()
    Write-Host "Added: $entryName ($($fileBytes.Length) bytes)"
}

Add-FileToZip "$PSScriptRoot\anime47\plugin.json" "plugin.json"
Add-FileToZip "$PSScriptRoot\anime47\icon.png" "icon.png"

$srcFiles = Get-ChildItem "$PSScriptRoot\anime47\src" -File
foreach ($file in $srcFiles) {
    Add-FileToZip $file.FullName "src/$($file.Name)"
}

$archive.Dispose()
$fs.Dispose()

Write-Host "Created valid ZIP file at $zipPath with size: $((Get-Item $zipPath).Length) bytes"
