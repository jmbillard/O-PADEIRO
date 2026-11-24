# Testes bons e ruins

## Testes bons

**Estilo integração**: teste por meio de interfaces reais, não de mocks de partes internas.

```typescript
// GOOD: Tests observable behavior
test("user can checkout with valid cart", async () => {
  const cart = createCart();
  cart.add(product);
  const result = await checkout(cart, paymentMethod);
  expect(result.status).toBe("confirmed");
});
```

Características:

- Testa o comportamento que importa para usuários/chamadores
- Usa só a API pública
- Sobrevive a refatorações internas
- Descreve O QUÊ, não COMO
- Uma asserção lógica por teste

## Testes ruins

**Testes de detalhe de implementação**: acoplados à estrutura interna.

```typescript
// BAD: Tests implementation details
test("checkout calls paymentService.process", async () => {
  const mockPayment = jest.mock(paymentService);
  await checkout(cart, payment);
  expect(mockPayment.process).toHaveBeenCalledWith(cart.total);
});
```

Sinais de alerta:

- Fazer mock de colaboradores internos
- Testar métodos privados
- Fazer asserções sobre quantidade/ordem de chamadas
- O teste quebra ao refatorar sem mudança de comportamento
- O nome do teste descreve COMO, não O QUÊ
- Verificar por meios externos em vez de pela interface

```typescript
// BAD: Bypasses interface to verify
test("createUser saves to database", async () => {
  await createUser({ name: "Alice" });
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
  expect(row).toBeDefined();
});

// GOOD: Verifies through interface
test("createUser makes user retrievable", async () => {
  const user = await createUser({ name: "Alice" });
  const retrieved = await getUser(user.id);
  expect(retrieved.name).toBe("Alice");
});
```

**Testes tautológicos**: o valor esperado repete a implementação, então o teste passa por construção.

```typescript
// BAD: Expected value is recomputed the way the code computes it
test("calculateTotal sums line items", () => {
  const items = [{ price: 10 }, { price: 5 }];
  const expected = items.reduce((sum, i) => sum + i.price, 0);
  expect(calculateTotal(items)).toBe(expected);
});

// GOOD: Expected value is an independent, known literal
test("calculateTotal sums line items", () => {
  expect(calculateTotal([{ price: 10 }, { price: 5 }])).toBe(15);
});
```
