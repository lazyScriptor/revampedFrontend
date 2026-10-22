@echo off
rem Creates a "GearGrid POS" desktop shortcut that opens GearGrid in Chrome/Edge with silent printing
rem (--kiosk-printing): bills go straight to the Windows DEFAULT printer, no print window.
rem Set your thermal printer as the Windows default printer first. Double-click this file once.
set "CHROME="
for %%P in ("%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "%LocalAppData%\Google\Chrome\Application\chrome.exe" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe") do (
  if exist %%P if not defined CHROME set "CHROME=%%~P"
)
if not defined CHROME (
  echo Chrome or Edge was not found. Please install Google Chrome and run this again.
  pause
  exit /b 1
)
set "GG_ARGS=--kiosk-printing --user-data-dir=%LocalAppData%\GearGridPOS --app=https://app.geargrid.live"
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\GearGrid POS.lnk'); $s.TargetPath=$env:CHROME; $s.Arguments=$env:GG_ARGS; $s.IconLocation=$env:CHROME+',0'; $s.Save()"
echo.
echo Done. Use the "GearGrid POS" icon on your desktop (sign in once). Bills now print without a print window.
pause
