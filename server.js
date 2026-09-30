/* ==========================================================================
   PLACAR PRO VNL — Servidor de sincronização (Node puro, sem dependências)
   - Serve os arquivos estáticos de /public
   - Sala por partida (?id=...)
   - GET  /state?id=   -> estado atual (JSON)
   - POST /update?id=  -> recebe novo estado e transmite a todos da sala
   - GET  /events?id=  -> stream SSE (tempo real) para overlay e demais controles
   Uso:  node server.js            (porta 3000, escuta na rede local)
         PORT=8080 node server.js  (outra porta)
   ========================================================================== */
'use strict';
var http = require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');
var os = require('os');

function ipLocal() {
  var ifs = os.networkInterfaces();
  for (var nome in ifs) {
    var lista = ifs[nome] || [];
    for (var i = 0; i < lista.length; i++) {
      var it = lista[i];
      if (it.family === 'IPv4' && !it.internal) return it.address;
    }
  }
  return 'localhost';
}

var PORT = process.env.PORT || 3000;
var HOST = process.env.HOST || '0.0.0.0';   // 0.0.0.0 = acessível na rede local (celular)
var PUBLIC = path.join(__dirname, 'public');
var DB = path.join(__dirname, 'dados-partidas.json');

/* ---------- persistência simples ---------- */
var salas = {};       // { id: estado }
var clientes = {};    // { id: [res, res, ...] } conexões SSE
try { salas = JSON.parse(fs.readFileSync(DB, 'utf8')); } catch (e) { salas = {}; }
var salvarTimer = null;
function persistir() {
  clearTimeout(salvarTimer);
  salvarTimer = setTimeout(function () {
    fs.writeFile(DB, JSON.stringify(salas), function () {});
  }, 500);
}

/* ---------- tipos MIME ---------- */
var MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

function enviarArquivo(res, arquivo) {
  fs.readFile(arquivo, function (err, data) {
    if (err) { res.writeHead(404); res.end('Nao encontrado'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(arquivo)] || 'application/octet-stream' });
    res.end(data);
  });
}

function transmitir(id) {
  var lista = clientes[id] || [];
  var payload = 'data: ' + JSON.stringify(salas[id]) + '\n\n';
  lista.forEach(function (res) { try { res.write(payload); } catch (e) {} });
}

var server = http.createServer(function (req, res) {
  var u = url.parse(req.url, true);
  var id = (u.query.id || 'demo').toString();

  /* ---- API ---- */
  if (u.pathname === '/state') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(salas[id] || {}));
    return;
  }

  if (u.pathname === '/update' && req.method === 'POST') {
    var corpo = '';
    req.on('data', function (c) { corpo += c; if (corpo.length > 2e6) req.destroy(); });
    req.on('end', function () {
      try {
        salas[id] = JSON.parse(corpo);
        persistir();
        transmitir(id);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end('{"ok":true}');
      } catch (e) {
        res.writeHead(400); res.end('{"ok":false}');
      }
    });
    return;
  }

  if (u.pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache',
      'Connection': 'keep-alive', 'Access-Control-Allow-Origin': '*'
    });
    res.write('retry: 3000\n\n');
    if (salas[id]) res.write('data: ' + JSON.stringify(salas[id]) + '\n\n');
    (clientes[id] = clientes[id] || []).push(res);
    var ping = setInterval(function () { try { res.write(': ping\n\n'); } catch (e) {} }, 25000);
    req.on('close', function () {
      clearInterval(ping);
      clientes[id] = (clientes[id] || []).filter(function (r) { return r !== res; });
    });
    return;
  }

  /* ---- arquivos estáticos ---- */
  var rel = decodeURIComponent(u.pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  var arquivo = path.join(PUBLIC, path.normalize(rel).replace(/^(\.\.[\/\\])+/, ''));
  if (arquivo.indexOf(PUBLIC) !== 0) { res.writeHead(403); res.end('Proibido'); return; }
  enviarArquivo(res, arquivo);
});

server.listen(PORT, HOST, function () {
  var ip = ipLocal();
  console.log('\n🏐  Placar Pro VNL rodando! (deixe esta janela ABERTA)');
  console.log('   ----------------------------------------------------------');
  console.log('   CONTROLE (neste PC):   http://localhost:' + PORT + '/');
  console.log('   OVERLAY p/ o OBS:      http://localhost:' + PORT + '/overlay.html?id=jogo1');
  console.log('   ----------------------------------------------------------');
  console.log('   Em outro PC / celular na MESMA rede use o IP:');
  console.log('   Controle:  http://' + ip + ':' + PORT + '/');
  console.log('   Overlay:   http://' + ip + ':' + PORT + '/overlay.html?id=jogo1');
  console.log('   ----------------------------------------------------------');
  console.log('   IMPORTANTE: use SEMPRE o MESMO id (ex.: jogo1) no controle e no overlay.');
  console.log('   No OBS: Fonte -> Navegador -> cole o endereco OVERLAY acima.\n');
});
