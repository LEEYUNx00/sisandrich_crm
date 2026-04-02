@echo off
title SiS & RICH Printer Bridge
echo --- SiS & RICH Printer Bridge Starting ---
echo --- Checking Dependencies...
cd /d "%~dp0"
call npm install
echo --- Starting Bridge Server...
npm start
pause
