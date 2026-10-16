import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const port = Number(process.env.PORT || 3000);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf'};
const server = createServer(async (request, response) => {
 try {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const base = pathname.startsWith('/assets/') ? path.join(root, 'public') : root;
  const file = path.resolve(base, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(base + path.sep) || !(await stat(file)).isFile()) throw new Error('Not found');
  response.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache'});
  response.end(await readFile(file));
 } catch {response.writeHead(404, {'Content-Type': 'text/plain'}); response.end('Not found');}
});
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}`));
