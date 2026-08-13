import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApp } from '../src/app.js';

test('GET /health informa que Pagamentos está saudável', async (t) => {
  const app = buildApp();
  t.after(() => app.close());

  const response = await app.inject({ method: 'GET', url: '/health' });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: 'ok', servico: 'pagamentos' });
});

test('POST /pagamentos aprova um pagamento válido', async (t) => {
  const app = buildApp();
  t.after(() => app.close());

  const response = await app.inject({
    method: 'POST',
    url: '/pagamentos',
    payload: { pedidoId: '1', valor: 49.9 }
  });

  assert.equal(response.statusCode, 201);
  assert.equal(response.json().pedidoId, '1');
  assert.equal(response.json().status, 'aprovado');
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
