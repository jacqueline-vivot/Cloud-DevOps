import Fastify from 'fastify';

export function buildApp() {
  const app = Fastify({ logger: true });
  const pedidos = new Map();
  let proximoId = 1;

  app.get('/health', async () => ({ status: 'ok', servico: 'pedidos' }));

  app.get('/pedidos', async () => Array.from(pedidos.values()));

  app.get('/pedidos/:id', async (request, reply) => {
    const pedido = pedidos.get(request.params.id);

    if (!pedido) {
      return reply.code(404).send({ erro: 'Pedido não encontrado' });
    }

    return pedido;
  });

  app.post('/pedidos', async (request, reply) => {
    const { produtoId, quantidade, cliente } = request.body ?? {};

    if (!produtoId || !Number.isInteger(quantidade) || quantidade <= 0) {
      return reply.code(400).send({
        erro: 'produtoId e quantidade inteira maior que zero são obrigatórios'
      });
    }

    const id = String(proximoId++);
    const pedido = {
      id,
      produtoId,
      quantidade,
      cliente: cliente ?? null,
      status: 'criado',
      criadoEm: new Date().toISOString()
    };

    pedidos.set(id, pedido);
    return reply.code(201).send(pedido);
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ erro: 'Rota não encontrada' });
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    reply.code(error.statusCode ?? 500).send({ erro: 'Erro ao processar a requisição' });
  });

  return app;
}
