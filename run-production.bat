@echo off
setlocal
cd /d "%~dp0"

title Madhav Bharat Gas Agency - Production Server
echo.
echo ================================================
echo   Madhav Bharat Gas Agency - Production Launcher
echo ================================================
echo.

where node >nul 2>&1 || goto :node_missing
where npm >nul 2>&1 || goto :npm_missing
if not exist ".env.local" goto :env_missing

echo [1/5] Installing locked production dependencies...
call npm ci
if errorlevel 1 goto :failed

echo [2/5] Checking PostgreSQL...
call npm run db:check
if errorlevel 1 goto :database_failed

echo [3/5] Applying database migrations...
call npm run db:setup
if errorlevel 1 goto :database_failed

echo [4/5] Building the production application...
call npm run build
if errorlevel 1 goto :failed

echo [5/5] Starting http://localhost:3000
call npm start
exit /b %errorlevel%

:node_missing
echo [ERROR] Node.js 20 or 22 is required.
goto :failed
:npm_missing
echo [ERROR] npm is not available in PATH.
goto :failed
:env_missing
echo [ERROR] .env.local was not found. Copy .env.example and configure it.
goto :failed
:database_failed
echo [ERROR] Database connection/setup failed. Run npm run db:check for the exact reason.
goto :failed
:failed
echo.
echo Production startup stopped. Review the message above.
pause
exit /b 1
