import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';

const startTime = Symbol('metricsStartTime');

export const loggerOptions = {
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password', 'password', '*.password', 'DATABASE_PASSWORD', '*.DATABASE_PASSWORD'],
    censor: '[REDACTED]'
  }
};

export function registerMetrics(app, service) {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry, prefix: 'loja_veloz_nodejs_', labels: { service } });
  const requests = new Counter({
    name: 'loja_veloz_http_requests_total', help: 'Total de requisições HTTP processadas',
    labelNames: ['service', 'method', 'route', 'status_code'], registers: [registry]
  });
  const duration = new Histogram({
    name: 'loja_veloz_http_request_duration_seconds', help: 'Duração das requisições HTTP em segundos',
    labelNames: ['service', 'method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5], registers: [registry]
  });
  app.addHook('onRequest', async (request) => { request[startTime] = process.hrtime.bigint(); });
  app.addHook('onResponse', async (request, reply) => {
    const labels = { service, method: request.method, route: request.routeOptions?.url ?? 'not_found', status_code: String(reply.statusCode) };
    requests.inc(labels);
    duration.observe(labels, Number(process.hrtime.bigint() - request[startTime]) / 1e9);
  });
  app.get('/metrics', async (_request, reply) => reply.type(registry.contentType).send(await registry.metrics()));
}

