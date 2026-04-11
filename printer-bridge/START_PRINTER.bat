@echo off
title SiS & RICH Printer Bridge
echo --------------------------------------------------
echo SIS ^& RICH Printer Bridge is starting...
echo --------------------------------------------------
echo.
cd /d "%~dp0"
node bridge.js
echo.
echo --------------------------------------------------
echo ERROR: The bridge has stopped! Please keep this window open.
pause
