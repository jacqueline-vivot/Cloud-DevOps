import Fastify from 'fastify';
import { loggerOptions, registerMetrics } from './observability.js';

async function encaminhar(request, reply, baseUrl, caminho) {
  const url = new URL(caminho, baseUrl);
  const opcoes = {
    method: request.method,
    headers: { accept: 'application/json' }
  };

  if (request.body !== undefined) {
    opcoes.headers['content-type'] = 'application/json';
    opcoes.body = JSON.stringify(request.body);
  }

  try {
    const resposta = await fetch(url, opcoes);
    const texto = await resposta.text();
    const conteudo = texto ? JSON.parse(texto) : null;
    return reply.code(resposta.status).send(conteudo);
  } catch (error) {
    request.log.error({ err: error, method: request.method, path: caminho }, 'Falha ao acessar microsserviço');
    return reply.code(502).send({ erro: 'Serviço temporariamente indisponível' });
  }
}

export function buildApp(config = {}) {
  const app = Fastify({ logger: loggerOptions });
  registerMetrics(app, 'gateway');
  const urls = {
    pedidos: config.pedidosUrl ?? process.env.PEDIDOS_URL ?? 'http://127.0.0.1:3001',
    pagamentos: config.pagamentosUrl ?? process.env.PAGAMENTOS_URL ?? 'http://127.0.0.1:3002',
    estoque: config.estoqueUrl ?? process.env.ESTOQUE_URL ?? 'http://127.0.0.1:3003'
  };

  app.get('/health', async () => ({ status: 'ok', servico: 'gateway' }));

  app.get('/pedidos', (request, reply) => encaminhar(request, reply, urls.pedidos, '/pedidos'));
  app.get('/pedidos/', (request, reply) => encaminhar(request, reply, urls.pedidos, '/pedidos/'));
  app.get('/pedidos/:id', (request, reply) =>
    encaminhar(request, reply, urls.pedidos, `/pedidos/${encodeURIComponent(request.params.id)}`));
  app.post('/pedidos', (request, reply) => encaminhar(request, reply, urls.pedidos, '/pedidos'));

  app.post('/pagamentos', (request, reply) =>
    encaminhar(request, reply, urls.pagamentos, '/pagamentos'));

  app.get('/estoque/:produtoId', (request, reply) =>
    encaminhar(request, reply, urls.estoque, `/estoque/${encodeURIComponent(request.params.produtoId)}`));
  app.post('/estoque/reservar', (request, reply) =>
    encaminhar(request, reply, urls.estoque, '/estoque/reservar'));

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ erro: 'Rota não encontrada' });
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'Falha ao processar requisição');
    reply.code(error.statusCode ?? 500).send({ erro: 'Erro ao processar a requisição' });
  });

  return app;
}
