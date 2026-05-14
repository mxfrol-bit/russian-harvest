@echo off
chcp 65001 > nul
REM ============================================================
REM Массовая загрузка JSON-файлов от 1С на Railway sftp-server
REM v2.6.22 · Русский Урожай
REM ============================================================
REM Использование:
REM   1. Положить этот файл в папку с JSON-файлами
REM   2. Двойной клик → отправит ВСЕ *.jsn и *.json из папки
REM   3. После завершения файлы появятся в Supabase Storage
REM      и в админке /admin-import-1c.html
REM ============================================================

setlocal enabledelayedexpansion

set API_URL=https://sftp-server-copy-copy-production.up.railway.app/upload
set API_KEY=agro_secret_2025

set /a TOTAL=0
set /a OK=0
set /a FAILED=0

echo.
echo ============================================================
echo  Загрузка JSON-файлов от 1С на Railway-сервис
echo ============================================================
echo  URL: %API_URL%
echo  Папка: %CD%
echo ============================================================
echo.

REM Сначала посчитаем сколько файлов
for %%F in (*.jsn *.json) do (
    set /a TOTAL+=1
)

if %TOTAL%==0 (
    echo [!] В этой папке нет .jsn или .json файлов
    echo     Положите этот .bat в папку с выгрузкой 1С и запустите снова
    pause
    exit /b 1
)

echo Найдено файлов для загрузки: %TOTAL%
echo.
set /p CONFIRM="Продолжить? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Отменено пользователем.
    pause
    exit /b 0
)
echo.

REM Загружаем по одному
for %%F in (*.jsn *.json) do (
    echo -^> Загружаю: %%F
    curl -s -X POST "%API_URL%" -H "x-api-key: %API_KEY%" -F "file=@%%F" -w " [HTTP %%{http_code}]\n" -o "%%F.response.tmp"
    if !ERRORLEVEL!==0 (
        set /a OK+=1
    ) else (
        set /a FAILED+=1
        echo    [X] Ошибка: curl exit code !ERRORLEVEL!
    )
    REM Опционально показать ответ
    if exist "%%F.response.tmp" (
        type "%%F.response.tmp"
        del "%%F.response.tmp"
    )
    echo.
)

echo ============================================================
echo  ИТОГ: %OK% из %TOTAL% загружено успешно, %FAILED% с ошибкой
echo ============================================================
echo.
echo  Проверить результат:
echo  - Supabase Storage → bucket "uploads"
echo  - Сайт → /admin-import-1c.html (только админ)
echo  - Старая админка: https://sftp-server-copy-copy-production.up.railway.app/admin
echo.
pause
