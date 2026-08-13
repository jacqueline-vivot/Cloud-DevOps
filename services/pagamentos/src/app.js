import Fastify from 'fastify';
import { loggerOptions, registerMetrics } from './observability.js';

export function buildApp() {
  const app = Fastify({ logger: loggerOptions });
  registerMetrics(app, 'pagamentos');
  let proximoId = 1;

  app.get('/health', async () => ({ status: 'ok', servico: 'pagamentos' }));

  app.post('/pagamentos', async (request, reply) => {
    const { pedidoId, valor } = request.body ?? {};

    if (!pedidoId || typeof valor !== 'number' || valor <= 0) {
      return reply.code(400).send({ erro: 'pedidoId e valor maior que zero são obrigatórios' });
    }

    return reply.code(201).send({
      id: String(proximoId++),
      pedidoId,
      valor,
      status: 'aprovado',
      processadoEm: new Date().toISOString()
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ erro: 'Rota não encontrada' });
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'Falha ao processar requisição');
    reply.code(error.statusCode ?? 500).send({ erro: 'Erro ao processar a requisição' });
  });

  return app;
}
