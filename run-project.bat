@echo off
setlocal
cd /d "%~dp0"

title Madhav Bharat Gas Agency - Development Server
echo.
echo ================================================
echo   Madhav Bharat Gas Agency - Project Launcher
echo ================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or is not available in PATH.
  echo Install Node.js 20 or 22 from https://nodejs.org/
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm is not available in PATH.
  pause
  exit /b 1
)

if not exist ".env.local" (
  echo [ERROR] .env.local was not found.
  echo Copy .env.example to .env.local and configure the database values.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [1/4] Installing project dependencies...
  call npm install
  if errorlevel 1 goto :failed
) else (
  echo [1/4] Dependencies are already installed.
)

echo [2/4] Checking PostgreSQL credentials and schema...
call npm run db:check
if errorlevel 1 goto :database_failed

echo [3/4] Applying idempotent database migrations...
call npm run db:setup
if errorlevel 1 goto :database_failed

echo [4/4] Starting the Next.js development server...
echo.
echo Website:    http://localhost:3000
echo Admin:      http://localhost:3000/admin/login
echo Login:      Use ADMIN_EMAIL and ADMIN_PASSWORD from .env.local
echo Stop server: Press Ctrl+C
echo.
call npm run dev
exit /b %errorlevel%

:database_failed
echo.
echo [ERROR] Database setup failed.
echo Confirm PostgreSQL is running and DATABASE_URI in .env.local contains the real password.
echo Test it directly with: npm run db:check
pause
exit /b 1

:failed
echo.
echo [ERROR] Project startup failed. Review the error shown above.
pause
exit /b 1
