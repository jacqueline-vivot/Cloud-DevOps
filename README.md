# Loja Veloz

Projeto acadêmico de Cloud DevOps baseado em uma arquitetura simples de microsserviços.

Nesta etapa, a aplicação contém quatro serviços Node.js independentes e um banco PostgreSQL:

- API Gateway (porta `3000`)
- Pedidos (porta interna `3001`)
- Pagamentos (porta interna `3002`)
- Estoque (porta interna `3003`)
- PostgreSQL (porta interna `5432`)

O Gateway é o único ponto de entrada publicado no computador host. No ambiente Docker, os serviços se comunicam pela rede interna usando seus nomes no Compose. Os pedidos são persistidos no PostgreSQL; os dados de Pagamentos e Estoque continuam simulados em memória nesta etapa.

## Executar com Docker Compose

É necessário ter Docker com o plugin Docker Compose instalado e em execução.

1. Crie o arquivo local de variáveis de ambiente a partir do exemplo:

   ```bash
   cp .env.example .env
   ```

   No PowerShell, use:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Se desejar, altere a senha de desenvolvimento em `.env`. Esse arquivo é ignorado pelo Git e não deve ser versionado.

3. Construa as imagens e inicie todo o ambiente:

   ```bash
   docker compose up --build -d
   ```

4. Verifique o estado e a saúde dos containers:

   ```bash
   docker compose ps
   docker compose logs
   ```

   Após a inicialização, os cinco containers devem permanecer em execução e apresentar estado saudável.

## Testar a aplicação

Com todos os serviços ativos, acesse o Gateway em `http://localhost:3000`:

```bash
curl http://localhost:3000/health
curl -X POST http://localhost:3000/pedidos \
  -H "Content-Type: application/json" \
  -d '{"produtoId":"produto-1","quantidade":1,"cliente":"cliente-exemplo"}'
curl http://localhost:3000/pedidos
```

Também é possível consultar um pedido específico pelo identificador retornado na criação:

```bash
curl http://localhost:3000/pedidos/1
```

## Encerrar o ambiente

Para encerrar e remover os containers e a rede, preservando os pedidos no volume do PostgreSQL:

```bash
docker compose down
```

Para apagar também o volume e recriar o banco sem dados na próxima inicialização:

```bash
docker compose down --volumes
```

> O comando com `--volumes` remove permanentemente os dados locais persistidos pelo PostgreSQL.

## Executar os serviços localmente sem Docker

É necessário ter Node.js 20 ou superior e uma instância PostgreSQL acessível para o serviço de Pedidos. Em cada pasta dentro de `services`, instale as dependências e inicie o serviço:

```bash
cd services/pedidos
npm install
npm run dev
```

Repita o processo em terminais separados para `pagamentos`, `estoque` e `gateway`. Para execução sem modo de observação, use `npm start`.

Cada serviço carrega configurações de um arquivo `.env` local. Use o `.env.example` da respectiva pasta como modelo. Para execução fora do Docker, configure no serviço de Pedidos as variáveis `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER` e `DATABASE_PASSWORD` de acordo com seu PostgreSQL local.
