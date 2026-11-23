---
name: wizard
description: Gere um assistente interativo em bash que guia um humano por passos que só ele pode executar. Use ao provisionar infraestrutura, configurar credenciais ou secrets de CI, percorrer um painel desconhecido de terceiros, ou executar uma migração ou virada pontual. Não invoque para passos que o próprio agente consegue executar.
---

# Wizard

Um **wizard** é um script bash que guia um humano, passo a passo, por um procedimento manual que é chato de fazer à mão e chato de reexplicar para uma IA toda vez. Ele abre cada URL, diz exatamente o que clicar e copiar, captura os valores, grava-os onde devem ficar (`.env`, secrets do GitHub), pede confirmação em cada etapa e mostra quantas etapas faltam. Pode configurar serviços de terceiros, executar uma migração pontual ou levar o projeto de um estado a outro.

A boa experiência de uso já está resolvida pelo [template.sh](template.sh): progresso etapa por etapa, pontos de confirmação, abertura de URL multiplataforma (incluindo WSL), entrada oculta de segredos, upserts idempotentes no `.env`, gravações com `gh secret`/`gh variable` e um resumo no final. **Seu trabalho é só delimitar o procedimento e escrever as etapas dele.** A biblioteca acima do marcador `STAGES` é idêntica em todo wizard; essa consistência é o ponto: nunca a edite à mão.

Um wizard é descartável por padrão: feito para uma execução, salvo num caminho de rascunho ou em `scripts/`, apagado quando o trabalho termina. Faça commit dele só quando o usuário quiser um caminho de configuração repetível que deva viver no repositório.

## Processo

### 1. Delimite o procedimento

Descubra cada passo manual que o humano precisa dar e cada valor capturado ao longo do caminho. Leia o repositório primeiro, não pergunte do nada:

- Para configuração: `.env`, `.env.example`, `.env.*`, `README`, `docker-compose*`, a configuração do framework e `.github/workflows/*` (cada referência `secrets.*` / `vars.*` é um valor que o wizard precisa produzir).
- Para uma migração ou transição: o estado atual, o estado-alvo e as ações irreversíveis entre eles.

Depois mostre ao usuário a lista ordenada de etapas e os valores que cada uma produz, e confirme: ele pode acrescentar, tirar ou reordenar.

**Pronto quando:** cada etapa tem nome, em ordem, e para cada valor capturado você sabe (a) onde o humano o obtém, (b) onde ele é gravado (`.env`, um secret do GitHub, ambos ou em lugar nenhum; algumas etapas são só ações) e (c) se é secreto (entrada oculta) ou público.

### 2. Mapeie o trajeto de cada etapa

Para cada etapa, escreva o caminho exato que um humano segue: qual URL abrir, o que fazer lá, onde um valor aparece, qual variável ele preenche: por exemplo, "Dashboard → Developers → API keys → Reveal test key → copiar". Onde você não souber de fato a interface atual ou o comando exato, diga isso e pergunte ao usuário ou consulte a documentação: nunca invente passos que podem não existir.

**Pronto quando:** cada etapa se traduz em instruções concretas que um desconhecido conseguiria seguir.

### 3. Escreva o wizard

Copie o `template.sh` para o caminho de destino. Substitua a etapa de exemplo por um `stage` para cada passo, em ordem de dependência. Use os helpers da biblioteca: `stage`, `say`/`step`, `open_url`, `ask`/`ask_secret`, `write_env`, `set_secret`/`set_var`, `pause`/`confirm`. Defina `TOTAL_STAGES` com o número de etapas que você escreveu.

Mantenha o nível que o template estabelece: abra a URL antes de pedir o valor dela, use `ask_secret` para qualquer coisa secreta, use `write_env` em todo valor persistido, `set_secret` só nos valores de que a CI realmente precisa, e `confirm` antes de qualquer ação irreversível. Cada `stage` limpa a tela para que só o passo atual fique visível: mantenha cada etapa numa única tarefa focada, para que nada de que o humano precise suma rolando. Não mexa na biblioteca acima do marcador.

### 4. Verifique e passe o bastão

- `bash -n <script>`; rode `shellcheck` se estiver disponível.
- `chmod +x <script>`.
- Não o execute de ponta a ponta você mesmo: ele abre navegadores e trava esperando entrada humana. Em vez disso, rastreie-o estaticamente: cada valor do passo 1 é capturado e vai parar onde o passo 1 disse, e cada nome em `set_secret` corresponde exatamente a uma referência `secrets.*` na CI.
- Diga ao usuário como executá-lo. Se for um caminho de configuração repetível, faça commit dele e linke-o no README, para que a próxima pessoa rode o script em vez de perguntar a uma IA.
