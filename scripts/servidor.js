// Servidor estático mínimo: o navegador não carrega módulos JS abrindo o index.html direto do disco.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(fileURLToPath(new URL('..', import.meta.url)));
const porta = Number(process.env.PORT) || 8000;
const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
};

createServer(async (req, res) => {
  const caminho = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const arquivo = resolve(join(raiz, caminho.endsWith('/') ? caminho + 'index.html' : caminho));
  if (arquivo !== raiz && !arquivo.startsWith(raiz + sep)) {
    res.writeHead(403).end('Proibido');
    return;
  }
  try {
    const conteudo = await readFile(arquivo);
    res.writeHead(200, { 'Content-Type': tipos[extname(arquivo)] ?? 'application/octet-stream' }).end(conteudo);
  } catch {
    res.writeHead(404).end('Não encontrado');
  }
}).listen(porta, () => console.log(`Agendador rodando em http://localhost:${porta}`));
