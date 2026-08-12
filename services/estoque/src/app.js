import Fastify from 'fastify';

export function buildApp() {
  const app = Fastify({ logger: true });
  const estoque = new Map([
    ['produto-1', 10],
    ['produto-2', 5]
  ]);

  app.get('/health', async () => ({ status: 'ok', servico: 'estoque' }));

  app.get('/estoque/:produtoId', async (request, reply) => {
    const { produtoId } = request.params;

    if (!estoque.has(produtoId)) {
      return reply.code(404).send({ erro: 'Produto não encontrado' });
    }

    return { produtoId, quantidadeDisponivel: estoque.get(produtoId) };
  });

  app.post('/estoque/reservar', async (request, reply) => {
    const { produtoId, quantidade } = request.body ?? {};

    if (!produtoId || !Number.isInteger(quantidade) || quantidade <= 0) {
      return reply.code(400).send({
        erro: 'produtoId e quantidade inteira maior que zero são obrigatórios'
      });
    }

    if (!estoque.has(produtoId)) {
      return reply.code(404).send({ erro: 'Produto não encontrado' });
    }

    const disponivel = estoque.get(produtoId);
    if (disponivel < quantidade) {
      return reply.code(409).send({ erro: 'Estoque insuficiente', quantidadeDisponivel: disponivel });
    }

    estoque.set(produtoId, disponivel - quantidade);
    return { produtoId, quantidadeReservada: quantidade, quantidadeDisponivel: disponivel - quantidade };
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
