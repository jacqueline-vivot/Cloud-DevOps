import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { NodeSDK } from '@opentelemetry/sdk-node';
if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  const sdk = new NodeSDK({ traceExporter: new OTLPTraceExporter(), instrumentations: [new HttpInstrumentation(), new FastifyInstrumentation(), new UndiciInstrumentation()] });
  try { sdk.start(); process.stdout.write(`${JSON.stringify({ level: 'info', message: 'OpenTelemetry tracing habilitado', service: process.env.OTEL_SERVICE_NAME ?? 'estoque' })}\n`); }
  catch (error) { process.stderr.write(`${JSON.stringify({ level: 'error', message: 'Falha ao iniciar OpenTelemetry', error: error.message })}\n`); }
}

