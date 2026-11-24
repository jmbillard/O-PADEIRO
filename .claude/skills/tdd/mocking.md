# Quando fazer mock

Faça mock só nas **fronteiras do sistema**:

- APIs externas (pagamento, e-mail etc.)
- Bancos de dados (às vezes - prefira um banco de teste)
- Tempo/aleatoriedade
- Sistema de arquivos (às vezes)

Não faça mock de:

- Suas próprias classes/módulos
- Colaboradores internos
- Qualquer coisa que você controla

## Projetando para facilitar o mock

Nas fronteiras do sistema, projete interfaces fáceis de mockar:

**1. Use injeção de dependência**

Passe as dependências externas como parâmetro em vez de criá-las internamente:

```typescript
// Easy to mock
function processPayment(order, paymentClient) {
  return paymentClient.charge(order.total);
}

// Hard to mock
function processPayment(order) {
  const client = new StripeClient(process.env.STRIPE_KEY);
  return client.charge(order.total);
}
```

**2. Prefira interfaces no estilo SDK a funções genéricas de fetch**

Crie funções específicas para cada operação externa em vez de uma função genérica com lógica condicional:

```typescript
// GOOD: Each function is independently mockable
const api = {
  getUser: (id) => fetch(`/users/${id}`),
  getOrders: (userId) => fetch(`/users/${userId}/orders`),
  createOrder: (data) => fetch('/orders', { method: 'POST', body: data }),
};

// BAD: Mocking requires conditional logic inside the mock
const api = {
  fetch: (endpoint, options) => fetch(endpoint, options),
};
```

A abordagem SDK significa que:
- Cada mock retorna um formato específico
- Não há lógica condicional na preparação do teste
- Fica mais fácil ver quais endpoints um teste exercita
- Há segurança de tipos por endpoint
