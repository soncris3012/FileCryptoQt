$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$QtPrefix = if ($env:QT_PREFIX) { $env:QT_PREFIX } else { "C:\Qt\6.8.0\msvc2022_64" }
cmake -S $Root -B "$Root\build-windows" -G "Visual Studio 17 2022" -A x64 -DCMAKE_PREFIX_PATH=$QtPrefix
cmake --build "$Root\build-windows" --config Release
$Dist = "$Root\dist\FileCryptoQt-Windows"
New-Item -ItemType Directory -Force -Path $Dist | Out-Null
Copy-Item "$Root\build-windows\Release\FileCryptoQt.exe" $Dist
& "$QtPrefix\bin\windeployqt.exe" --release --multimedia "$Dist\FileCryptoQt.exe"
Compress-Archive -Path "$Dist\*" -DestinationPath "$Root\dist\FileCryptoQt-Windows-x64.zip" -Force
Write-Host "Created dist\FileCryptoQt-Windows-x64.zip"
