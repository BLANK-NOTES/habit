@echo off
title Habit Tracker Server
echo.
echo  Starting Habit Tracker...
echo.

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js not found.
    echo  Download from: https://nodejs.org
    pause
    exit /b
)

:: Check server.js exists
if not exist "%~dp0server.js" (
    echo  ERROR: server.js not found in this folder.
    echo  Make sure server.js is in the same folder as this file.
    pause
    exit /b
)

echo  Server starting on http://localhost:3000
echo  Press Ctrl+C to stop the server.
echo.

:: Run server (this keeps the window open and shows output)
:: Browser will open automatically once server confirms it's ready
node "%~dp0server.js"
pause