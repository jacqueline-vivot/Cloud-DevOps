import Fastify from 'fastify';
import { DatabaseUnavailableError, queryDatabase } from './database.js';
import { loggerOptions, registerMetrics } from './observability.js';

function mapPedido(row) {
  return {
    id: String(row.id),
    produtoId: row.produto_id,
    quantidade: row.quantidade,
    cliente: row.cliente,
    status: row.status,
    criadoEm: row.criado_em.toISOString()
  };
}

export function buildApp(pool) {
  const app = Fastify({ logger: loggerOptions });
  registerMetrics(app, 'pedidos');

  app.get('/health', async (_request, reply) => {
    await queryDatabase(pool, 'SELECT 1');
    return reply.send({ status: 'ok', servico: 'pedidos' });
  });

  async function listarPedidos() {
    const result = await queryDatabase(pool, `
      SELECT id, produto_id, quantidade, cliente, status, criado_em
      FROM pedidos
      ORDER BY id
    `);
    return result.rows.map(mapPedido);
  }

  app.get('/pedidos', listarPedidos);
  app.get('/pedidos/', listarPedidos);

  app.get('/pedidos/:id', async (request, reply) => {
    if (!/^\d+$/.test(request.params.id)) {
      return reply.code(404).send({ erro: 'Pedido não encontrado' });
    }

    const result = await queryDatabase(pool, `
      SELECT id, produto_id, quantidade, cliente, status, criado_em
      FROM pedidos
      WHERE id = $1
    `, [request.params.id]);

    if (result.rowCount === 0) {
      return reply.code(404).send({ erro: 'Pedido não encontrado' });
    }

    return mapPedido(result.rows[0]);
  });

  app.post('/pedidos', async (request, reply) => {
    const { produtoId, quantidade, cliente } = request.body ?? {};

    if (!produtoId || !Number.isInteger(quantidade) || quantidade <= 0) {
      return reply.code(400).send({
        erro: 'produtoId e quantidade inteira maior que zero são obrigatórios'
      });
    }

    const result = await queryDatabase(pool, `
      INSERT INTO pedidos (produto_id, quantidade, cliente)
      VALUES ($1, $2, $3)
      RETURNING id, produto_id, quantidade, cliente, status, criado_em
    `, [produtoId, quantidade, cliente ?? null]);

    return reply.code(201).send(mapPedido(result.rows[0]));
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ erro: 'Rota não encontrada' });
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'Falha ao processar requisição');

    if (error instanceof DatabaseUnavailableError) {
      return reply.code(503).send({ erro: 'Banco de dados temporariamente indisponível' });
    }

    reply.code(error.statusCode ?? 500).send({ erro: 'Erro ao processar a requisição' });
  });

  return app;
}
