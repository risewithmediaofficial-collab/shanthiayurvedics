@echo off
echo ====================================================
echo Starting MongoDB Service for Shanthi Ayurvedas CRM
echo ====================================================
echo.
net start MongoDB
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [NOTE] If you got 'Access is denied', please:
    echo 1. Right-click this file or your terminal
    echo 2. Select 'Run as administrator'
    echo 3. Run: net start MongoDB
    echo.
    pause
) else (
    echo.
    echo [SUCCESS] MongoDB is now running on port 27017!
    echo You can now run: npm run start
    echo.
)
