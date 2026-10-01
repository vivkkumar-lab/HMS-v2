@echo off
set PATH=f:\Hospital Soft\bin\python;f:\Hospital Soft\bin\pgsql\bin;%PATH%
cd /d "f:\Hospital Soft"
"f:\Hospital Soft\bin\python\python.exe" -m uvicorn backend.main:app --port 8000 --host 127.0.0.1
