# Loja Veloz

Projeto acadêmico de Cloud DevOps baseado em uma arquitetura simples de microsserviços.

Nesta etapa, a aplicação contém quatro serviços Node.js independentes:

- API Gateway (`localhost:3000`)
- Pedidos (`localhost:3001`)
- Pagamentos (`localhost:3002`)
- Estoque (`localhost:3003`)

Os dados são simulados e mantidos em memória. PostgreSQL e a infraestrutura serão adicionados em etapas posteriores.

## Executar localmente sem Docker

É necessário ter Node.js 20 ou superior. Em cada pasta dentro de `services`, instale as dependências e inicie o serviço:

```bash
cd services/pedidos
npm install
npm run dev
```

Repita o processo em terminais separados para `pagamentos`, `estoque` e `gateway`. Para execução sem modo de observação, use `npm start`.

Cada serviço carrega configurações de um arquivo `.env` local. Esse arquivo é opcional porque há valores padrão; use o `.env.example` da respectiva pasta como modelo.

Com todos os serviços ativos, o Gateway é o ponto de entrada em `http://localhost:3000`. Por exemplo:

```bash
curl http://localhost:3000/health
curl -X POST http://localhost:3000/pedidos \
  -H "Content-Type: application/json" \
  -d '{"produtoId":"produto-1","quantidade":1}'
```
