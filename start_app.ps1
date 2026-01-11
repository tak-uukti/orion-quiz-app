$backend = Start-Process uvicorn -ArgumentList "server.main:sio_app --reload --port 8000" -PassThru
Write-Host "Backend started with PID $($backend.Id)"

Set-Location client
npm run dev

# Cleanup on exit (Ctrl+C)
Stop-Process -Id $backend.Id
