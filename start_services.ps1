$baseDir = "f:\Hospital Soft"
$binDir = "$baseDir\bin"
$env:PATH = "$binDir\nodejs;$binDir\python;$env:PATH"

# 1. Database
Write-Host "Starting Database..."
$postmasterLock = "$binDir\pgsql\data\postmaster.pid"
if (Test-Path $postmasterLock) {
    Remove-Item $postmasterLock -Force
}
Start-Process -FilePath "$binDir\pgsql\bin\postgres.exe" -ArgumentList "-D `"$binDir\pgsql\data`"" -WindowStyle Hidden

# 2. Backend
Write-Host "Starting FastAPI Backend..."
Start-Process -FilePath "$binDir\python\python.exe" -ArgumentList "-m uvicorn backend.main:app --host 0.0.0.0 --port 8000" -WorkingDirectory "$baseDir" -WindowStyle Hidden

# 3. Frontend
Write-Host "Starting Frontend..."
Start-Process -FilePath "$binDir\nodejs\npm.cmd" -ArgumentList "run dev -- --port 3000 --host" -WorkingDirectory "$baseDir\frontend" -WindowStyle Hidden

Write-Host "Services started successfully."
