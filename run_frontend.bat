@echo off
set PATH=f:\Hospital Soft\bin\nodejs;%PATH%
cd /d "f:\Hospital Soft\frontend"
call "f:\Hospital Soft\bin\nodejs\npm.cmd" run dev -- --port 3000 --host 127.0.0.1
