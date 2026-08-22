// Свой PeerServer для сигналинга call.js (ADR 0006, уточнение после #25).
// Заменяет ненадёжный публичный 0.peerjs.com, который рвёт wss на
// мобильных операторах (close code 1006).
const { PeerServer } = require('peer');

const PORT = process.env.PORT || 9000;

const server = PeerServer({
  port: PORT,
  path: '/',
  allow_discovery: false,
  proxied: true, // за реверс-прокси Render (важно для корректных IP/протокола)
});

server.on('connection', client => {
  console.log('[peer-server] connected:', client.getId());
});
server.on('disconnect', client => {
  console.log('[peer-server] disconnected:', client.getId());
});

console.log(`[peer-server] listening on :${PORT}`);
