# peer-server

Свой сигналинг-сервер PeerJS для js/call.js. Причина: публичный
0.peerjs.com рвёт wss на мобильных операторах (code 1006) — основной
сценарий использования звонка.

## Деплой на Render (бесплатно)

1. render.com → New → Web Service → подключить репозиторий Ssazurov/earth-3d.
2. Root Directory: `peer-server`
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Instance Type: Free
6. Создать сервис, дождаться деплоя, скопировать домен вида
   `https://earth-3d-peer-server.onrender.com`

## После деплоя

Передать домен — обновлю `js/call.js`, чтобы `new Peer()` шёл на этот
сервер вместо `0.peerjs.com`.

Локальный запуск для проверки:
```
cd peer-server
npm install
npm start
```
