$pgCtl = "f:\Hospital Soft\bin\pgsql\bin\pg_ctl.exe"
$pgData = "f:\Hospital Soft\bin\pgsql\data"
& $pgCtl -D $pgData -l f:\Hospital Soft\pgsql.log start
Read-Host "PostgreSQL is running. Press Enter to stop it."
& $pgCtl -D $pgData stop
