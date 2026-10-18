@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === 1/3 Фото ===
python tools\build_photos.py || goto fail
echo === 2/3 Збираю сайт ===
if exist dist rmdir /s /q dist
mkdir dist
copy /y index.html dist\ >nul
copy /y photos.json dist\ >nul
xcopy /e /i /q css dist\css >nul
xcopy /e /i /q js dist\js >nul
xcopy /e /i /q fonts dist\fonts >nul
if exist ph xcopy /e /i /q ph dist\ph >nul
echo === 3/3 Заливаю на Cloudflare ===
call npx --yes wrangler@4 deploy || goto fail
echo.
echo Готово! https://capas-studio-3d.art-gulenko.workers.dev
pause
exit /b 0
:fail
echo.
echo Щось пішло не так, подивись повідомлення вище.
pause
exit /b 1
