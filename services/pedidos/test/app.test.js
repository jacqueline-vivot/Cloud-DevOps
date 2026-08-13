import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApp } from '../src/app.js';

function createPoolDouble() {
  const pedidos = [];

  return {
    async query(sql, values = []) {
      if (sql.includes('SELECT 1')) {
        return { rows: [{ health: 1 }], rowCount: 1 };
      }

      if (sql.includes('INSERT INTO pedidos')) {
        const pedido = {
          id: String(pedidos.length + 1),
          produto_id: values[0],
          quantidade: values[1],
          cliente: values[2],
          status: 'criado',
          criado_em: new Date('2026-01-01T12:00:00.000Z')
        };
        pedidos.push(pedido);
        return { rows: [pedido], rowCount: 1 };
      }

      return { rows: pedidos, rowCount: pedidos.length };
    }
  };
}

test('GET /health valida a conexão e informa que Pedidos está saudável', async (t) => {
  const app = buildApp(createPoolDouble());
  t.after(() => app.close());

  const response = await app.inject({ method: 'GET', url: '/health' });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: 'ok', servico: 'pedidos' });
});

test('POST /pedidos cria um pedido usando a camada de persistência', async (t) => {
  const app = buildApp(createPoolDouble());
  t.after(() => app.close());

  const response = await app.inject({
    method: 'POST',
    url: '/pedidos',
    payload: { produtoId: 'produto-1', quantidade: 2, cliente: 'cliente-teste' }
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.json(), {
    id: '1',
    produtoId: 'produto-1',
    quantidade: 2,
    cliente: 'cliente-teste',
    status: 'criado',
    criadoEm: '2026-01-01T12:00:00.000Z'
  });
});

test('GET /metrics expõe métricas HTTP e do processo Node.js', async (t) => {
  const app = buildApp(createPoolDouble());
  t.after(() => app.close());
  await app.inject({ method: 'GET', url: '/health' });
  const response = await app.inject({ method: 'GET', url: '/metrics' });
  assert.equal(response.statusCode, 200);
  assert.match(response.body, /loja_veloz_http_requests_total/);
  assert.match(response.body, /loja_veloz_nodejs_process_cpu/);
});

