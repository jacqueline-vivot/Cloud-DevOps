import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApp } from '../src/app.js';

test('GET /health informa que Estoque está saudável', async (t) => {
  const app = buildApp();
  t.after(() => app.close());

  const response = await app.inject({ method: 'GET', url: '/health' });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: 'ok', servico: 'estoque' });
});

test('POST /estoque/reservar reduz o estoque disponível', async (t) => {
  const app = buildApp();
  t.after(() => app.close());

  const response = await app.inject({
    method: 'POST',
    url: '/estoque/reservar',
    payload: { produtoId: 'produto-1', quantidade: 2 }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    produtoId: 'produto-1',
    quantidadeReservada: 2,
    quantidadeDisponivel: 8
  });
});

test('GET /metrics expõe métricas HTTP e do processo Node.js', async (t) => {
  const app = buildApp();
  t.after(() => app.close());
  await app.inject({ method: 'GET', url: '/health' });
  const response = await app.inject({ method: 'GET', url: '/metrics' });
  assert.equal(response.statusCode, 200);
  assert.match(response.body, /loja_veloz_http_requests_total/);
  assert.match(response.body, /loja_veloz_nodejs_process_cpu/);
});
