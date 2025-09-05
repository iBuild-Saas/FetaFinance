@echo off
echo Checking git status...
git status
echo.
echo Adding all files...
git add .
echo.
echo Committing changes...
git commit -m "Update SQL files and financial system improvements"
echo.
echo Pushing to remote repository...
git push
echo.
echo Git operations completed.
pause
