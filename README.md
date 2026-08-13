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
