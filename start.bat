@echo off
echo.
echo  ====================================================
echo   GEOPOLITICAL RADAR — Starting up...
echo  ====================================================
echo.

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js not found!
    echo  Download from https://nodejs.org
    pause
    exit /b 1
)

echo  [1/3] Installing server dependencies...
cd server
call npm install --silent
cd ..

echo  [2/3] Installing client dependencies...
cd client
call npm install --silent
cd ..

echo  [3/3] Starting services...
echo.
echo  Backend  -^> http://localhost:3001
echo  Frontend -^> http://localhost:3000
echo.
echo  Press Ctrl+C to stop
echo.

:: Start server in new window
start "Radar API Server" cmd /k "cd server && node index.js"

:: Wait a moment for server to initialize
timeout /t 3 /nobreak >nul

:: Start client in new window
start "Radar Frontend" cmd /k "cd client && npm run dev"

:: Open browser after a short delay
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo  Both services started in separate windows.
echo  Close those windows to stop the app.
pause
