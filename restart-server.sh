#!/usr/bin/env bash
# Перезапуск dev-сервера earth-3d (http://localhost:8080)
set -e

PORT=8080
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$DIR/.server.pid"
LOG_FILE="$DIR/.server.log"

# Остановить старый процесс, если запущен
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  kill "$(cat "$PID_FILE")"
  sleep 0.5
fi

# На всякий случай убить всё, что занимает порт
fuser -k ${PORT}/tcp 2>/dev/null || true
sleep 0.5

# Запустить сервер в фоне
cd "$DIR"
nohup python3 -m http.server $PORT > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

sleep 0.5
if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Сервер запущен: http://localhost:${PORT}/index.html (PID $(cat "$PID_FILE"))"
else
  echo "Не удалось запустить сервер, см. $LOG_FILE"
  exit 1
fi
