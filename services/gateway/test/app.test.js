import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApp } from '../src/app.js';

test('GET /health informa que o Gateway está saudável', async (t) => {
  const app = buildApp();
  t.after(() => app.close());

  const response = await app.inject({ method: 'GET', url: '/health' });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: 'ok', servico: 'gateway' });
});

test('rota desconhecida retorna 404', async (t) => {
  const app = buildApp();
  t.after(() => app.close());

  const response = await app.inject({ method: 'GET', url: '/inexistente' });

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), { erro: 'Rota não encontrada' });
});

