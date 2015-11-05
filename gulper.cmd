title configer
cd %~d0
cd %~p0
set path=%path%;%APPDATA%\npm

call gulp


rem @echo off
set /p msg="commit message: "
git commit -a -m %msg%

git push

pause