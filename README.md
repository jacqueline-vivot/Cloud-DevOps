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

## Executar com Kubernetes

Os manifests da aplicação estão em `kubernetes/`, numerados por componente e ordem lógica:

- namespace `loja-veloz`, com Pod Security Admission no perfil `restricted`;
- ConfigMap, Secret, PVC, StatefulSet e Service do PostgreSQL;
- ConfigMap, Deployment, Service e HPA de Pedidos;
- Deployment e Service de Pagamentos;
- Deployment e Service de Estoque;
- ConfigMap, Deployment, Service NodePort e HPA do Gateway;
- `kustomization.yaml`, que reúne todos os recursos.

O PostgreSQL utiliza um StatefulSet com uma réplica porque precisa de identidade e armazenamento estáveis. O PVC solicita `1Gi`; a StorageClass padrão do cluster deve permitir provisionamento dinâmico. Todos os componentes pertencem ao namespace `loja-veloz`.

### Requisitos

- Kubernetes 1.25 ou superior;
- `kubectl` configurado para o cluster desejado;
- uma StorageClass padrão para o PVC;
- Metrics Server para que os HPAs obtenham métricas de CPU;
- imagens da aplicação disponíveis no cluster.

As imagens referenciadas são `loja-veloz/gateway:1.0.0`, `loja-veloz/pedidos:1.0.0`, `loja-veloz/pagamentos:1.0.0` e `loja-veloz/estoque:1.0.0`. Elas não usam `latest`. Na etapa futura de CI/CD, deverão ser publicadas em um registry e os nomes poderão ser ajustados para o endereço desse registry.

O Secret versionado contém somente credenciais explícitas de demonstração. Em produção, não armazene credenciais no Git: utilize um gerenciador externo de secrets e faça a rotação dos valores.

### Carregar imagens em um cluster local

No Minikube, é possível construir diretamente no armazenamento de imagens do cluster:

```bash
minikube image build -t loja-veloz/gateway:1.0.0 services/gateway
minikube image build -t loja-veloz/pedidos:1.0.0 services/pedidos
minikube image build -t loja-veloz/pagamentos:1.0.0 services/pagamentos
minikube image build -t loja-veloz/estoque:1.0.0 services/estoque
```

Em outros ambientes locais, construa as mesmas tags e carregue-as conforme o mecanismo oferecido pelo cluster. O `imagePullPolicy: IfNotPresent` permite usar essas imagens locais.

### Aplicar e verificar

Antes de aplicar, valide os manifests localmente:

```bash
kubectl apply --dry-run=client -k kubernetes
```

Crie ou atualize os recursos:

```bash
kubectl apply -k kubernetes
kubectl get pods,services,pvc -n loja-veloz
kubectl rollout status statefulset/postgres -n loja-veloz
kubectl rollout status deployment/pedidos -n loja-veloz
kubectl rollout status deployment/gateway -n loja-veloz
```

Para acompanhar logs:

```bash
kubectl logs -n loja-veloz deployment/gateway --tail=100 -f
kubectl logs -n loja-veloz deployment/pedidos --tail=100 -f
kubectl logs -n loja-veloz statefulset/postgres --tail=100 -f
```

Para verificar os autoscalers:

```bash
kubectl get hpa -n loja-veloz
kubectl describe hpa gateway -n loja-veloz
kubectl describe hpa pedidos -n loja-veloz
```

### Acessar o Gateway localmente

O Gateway utiliza um NodePort fixo em `30080`. No Minikube, obtenha a URL acessível com:

```bash
minikube service gateway -n loja-veloz --url
```

Alternativamente, faça um redirecionamento temporário para `localhost:3000`:

```bash
kubectl port-forward -n loja-veloz service/gateway 3000:3000
```

Em seguida, teste `http://localhost:3000/health`. Os outros serviços são internos e são acessados pelo Gateway por DNS Kubernetes, por exemplo `http://pedidos:3001`.

### Remover os recursos

```bash
kubectl delete -k kubernetes
```

Esse comando também remove o PVC e os dados persistidos do PostgreSQL. Faça backup antes caso precise conservar os pedidos.

## CI/CD

O workflow principal está em `.github/workflows/ci-cd.yml` e é executado nos seguintes eventos:

- push para `develop`;
- push para `main`;
- pull request direcionado para `main`.

O pipeline possui três grupos de jobs:

1. **Validação Node.js:** executa uma matriz para Gateway, Pedidos, Pagamentos e Estoque. Cada serviço usa Node.js 22, cache npm baseado no respectivo `package-lock.json`, instalação reproduzível com `npm ci`, validação de sintaxe, testes automatizados e auditoria das dependências de produção.
2. **Validação Kubernetes:** instala uma versão fixa do `kubectl`, renderiza o `kustomization.yaml` e valida os recursos renderizados contra os schemas Kubernetes com Kubeconform. Essa etapa não acessa nem modifica um cluster.
3. **Imagens de containers:** após as validações, usa Docker Buildx para processar os quatro Dockerfiles em paralelo. Pull requests executam um job de build sem publicação; pushes executam um job separado de build e publicação. O cache do GitHub Actions é separado por serviço.

### Publicação no GHCR

As imagens seguem o padrão:

```text
ghcr.io/<proprietario-do-repositorio>/loja-veloz-<servico>:<tag>
```

Exemplos:

```text
ghcr.io/exemplo/loja-veloz-gateway:sha-a1b2c3d
ghcr.io/exemplo/loja-veloz-pedidos:develop
ghcr.io/exemplo/loja-veloz-estoque:1.0.0
```

As tags geradas são:

- `sha-<commit>` para rastreabilidade imutável em todos os eventos;
- nome da branch nos pushes, como `develop` ou `main`;
- `pr-<número>` durante a validação de pull requests;
- `1.0.0` nos pushes para `main`, representando a versão estável acadêmica atual.

Em pull requests, as imagens são construídas, mas `push` permanece desabilitado e não ocorre autenticação no registry. Em pushes para `develop` e `main`, o workflow autentica no `ghcr.io` usando somente o `GITHUB_TOKEN` temporário fornecido pelo GitHub Actions e publica as imagens. Nenhum token adicional fica armazenado no repositório.

Os manifests Kubernetes base continuam usando os nomes locais `loja-veloz/<servico>:1.0.0` para facilitar demonstrações com Minikube. Antes de um deploy usando GHCR, a futura etapa de implantação deverá sobrescrever essas imagens com os nomes completos do registry, preferencialmente usando as tags imutáveis `sha-<commit>`. Caso os pacotes GHCR sejam privados, o cluster também precisará de um `imagePullSecret`.

### Configuração no GitHub

O workflow pode ser acompanhado na aba **Actions** do repositório, selecionando o workflow **CI/CD**.

Normalmente, `GITHUB_TOKEN` e as permissões declaradas no próprio workflow são suficientes. Dependendo das políticas da organização ou do repositório, pode ser necessário:

- permitir a execução de GitHub Actions em **Settings > Actions > General**;
- permitir que workflows publiquem pacotes com `GITHUB_TOKEN`;
- ajustar a visibilidade e as permissões de acesso dos pacotes no GHCR;
- permitir as ações externas utilizadas pelo workflow, caso exista uma allowlist organizacional.

Somente o job de publicação, restrito a eventos `push`, recebe `contents: read` e `packages: write`. Todos os jobs executados em pull requests recebem somente `contents: read`. Não existe deploy automático nesta etapa.

## Observabilidade e Deploy

Esta etapa adiciona observabilidade voltada ao Kubernetes sem alterar o fluxo do Docker Compose. Os manifests ficam em `kubernetes/observability/` e são incluídos automaticamente pelo `kubernetes/kustomization.yaml` principal.

### Estratégia Rolling Update

Gateway, Pedidos, Pagamentos e Estoque utilizam explicitamente a estratégia `RollingUpdate` com `maxUnavailable: 0` e `maxSurge: 1`. Durante uma atualização, o Kubernetes cria no máximo um pod adicional e só encerra um pod antigo quando o substituto estiver pronto. Essa estratégia foi escolhida porque mantém a aplicação disponível, permite atualização gradual e oferece rollback nativo sem a complexidade operacional de Blue/Green ou Canary para este MVP.

As `readinessProbe` impedem que um pod novo receba tráfego antes de responder corretamente em `/health`. O PostgreSQL continua como StatefulSet e não recebeu essa configuração de Deployment, pois uma atualização de banco exige cuidados próprios com estado, compatibilidade e backup.

Para atualizar uma imagem e acompanhar o rollout:

```bash
kubectl set image deployment/gateway gateway=ghcr.io/<proprietario>/loja-veloz-gateway:<tag> -n loja-veloz
kubectl rollout status deployment/gateway -n loja-veloz
kubectl get pods -n loja-veloz --watch
```

Para consultar histórico e estado:

```bash
kubectl rollout history deployment/gateway -n loja-veloz
kubectl describe deployment gateway -n loja-veloz
```

Para desfazer a última atualização ou retornar a uma revisão específica:

```bash
kubectl rollout undo deployment/gateway -n loja-veloz
kubectl rollout undo deployment/gateway --to-revision=2 -n loja-veloz
```

Os mesmos comandos se aplicam a `pedidos`, `pagamentos` e `estoque`.

### Logs estruturados

Os quatro serviços usam o logger JSON do Fastify/Pino e escrevem exclusivamente em stdout/stderr. Não há arquivos locais de log. Requisições, respostas, tempos e erros são registrados com campos estruturados; cabeçalhos de autenticação, cookies e campos de senha são redigidos. O nível pode ser controlado por `LOG_LEVEL`, configurado como `info` nos Deployments.

Para consultar logs:

```bash
kubectl logs -n loja-veloz deployment/gateway --tail=100 -f
kubectl logs -n loja-veloz deployment/pedidos --tail=100 -f
```

Em produção, esses logs seriam coletados por uma solução externa, como Loki, Elasticsearch ou o serviço de logs do provedor de nuvem. Essa agregação não faz parte do MVP atual.

### Métricas e Prometheus

Cada microsserviço expõe `/metrics` no mesmo servidor HTTP. As métricas incluem:

- métricas padrão do processo Node.js, com prefixo `loja_veloz_nodejs_`;
- `loja_veloz_http_requests_total`, separada por serviço, método, rota e status;
- `loja_veloz_http_request_duration_seconds`, histograma de latência com os mesmos rótulos.

O Prometheus consulta os quatro Services a cada 15 segundos e mantém dados por 24 horas em armazenamento efêmero. Para acessar localmente:

```bash
minikube service prometheus -n loja-veloz --url
```

Ou com port-forward:

```bash
kubectl port-forward -n loja-veloz service/prometheus 9090:9090
```

Consultas PromQL úteis:

```promql
sum by (service) (rate(loja_veloz_http_requests_total[5m]))
histogram_quantile(0.95, sum by (le, service) (rate(loja_veloz_http_request_duration_seconds_bucket[5m])))
sum by (service) (rate(loja_veloz_http_requests_total{status_code=~"5.."}[5m]))
loja_veloz_nodejs_process_resident_memory_bytes
```

### Grafana

O Grafana recebe o Prometheus como datasource padrão por provisioning. Para a demonstração acadêmica, o acesso anônimo somente leitura está habilitado e não existe credencial armazenada no Git.

```bash
minikube service grafana -n loja-veloz --url
```

Ou:

```bash
kubectl port-forward -n loja-veloz service/grafana 3001:3000
```

Não foi versionado um dashboard complexo. Os quatro painéis recomendados usam as consultas acima para taxa de requisições, latência p95, erros HTTP 5xx e memória do processo. Em produção, dashboards, autenticação e persistência do Grafana seriam gerenciados separadamente.

### Tracing distribuído

Os serviços utilizam OpenTelemetry com instrumentações direcionadas para HTTP, Fastify e Undici/`fetch`. O Gateway propaga automaticamente o contexto W3C para Pedidos, Pagamentos e Estoque. Os spans são enviados por OTLP/HTTP ao OpenTelemetry Collector, que agrupa e encaminha os traces por OTLP/gRPC ao Jaeger.

```text
Gateway e microsserviços -> OTLP/HTTP -> OpenTelemetry Collector -> OTLP/gRPC -> Jaeger
```

O tracing é ativado somente quando `OTEL_EXPORTER_OTLP_ENDPOINT` está configurado. Nos Deployments, ele aponta para `http://otel-collector:4318`; no Docker Compose e na execução local sem essa variável, os serviços continuam funcionando sem exportar traces.

Para abrir o Jaeger:

```bash
minikube service jaeger-ui -n loja-veloz --url
```

Ou:

```bash
kubectl port-forward -n loja-veloz service/jaeger-ui 16686:16686
```

Depois de chamar uma rota pelo Gateway, selecione o serviço `gateway` no Jaeger para visualizar a sequência distribuída.

### Limitações acadêmicas

- Prometheus, Grafana e Jaeger usam `emptyDir`; os dados são perdidos quando os pods são recriados.
- O Prometheus consulta os Services diretamente. Com várias réplicas, o balanceamento pode não coletar todas em cada ciclo; produção usaria descoberta de pods ou Prometheus Operator.
- O tracing cobre HTTP, Fastify e `fetch`, mas não cria spans detalhados para consultas PostgreSQL.
- Não há alertas, retenção de longo prazo, autenticação robusta ou alta disponibilidade no stack de observabilidade.
- Os NodePorts são destinados somente a demonstração local. Produção utilizaria Ingress, TLS e controle de acesso.
- A estratégia adotada é Rolling Update para todos os serviços stateless; Canary e Blue/Green permanecem fora do escopo deste MVP.
