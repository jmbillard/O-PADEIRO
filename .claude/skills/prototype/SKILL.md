---
name: prototype
description: Monta um protótipo descartável para responder a uma pergunta de design. Use quando o usuário quiser conferir se um modelo de estado ou uma lógica parece certa, ou explorar como uma UI deveria ficar.
---

# Protótipo

Um protótipo é **código descartável que responde a uma pergunta**. A pergunta decide o formato.

## Escolha um ramo

Identifique qual pergunta está sendo respondida, usando o prompt do usuário, o código ao redor, ou perguntando se o usuário estiver por perto:

- **"Essa lógica / esse modelo de estado parece certo?"** → [LOGIC.md](LOGIC.md). Monte um único arquivo HTML compartilhável (botões de uso livre mais roteiros guiados em abas) que leve a máquina de estados por casos difíceis de raciocinar no papel, e que alguém que não é desenvolvedor consiga conduzir.
- **"Como isso deveria ficar?"** → [UI.md](UI.md). Gere várias variações de UI radicalmente diferentes numa única rota, alternáveis por um parâmetro de busca na URL e por uma barra flutuante na parte de baixo.

Os dois ramos produzem artefatos muito diferentes, então errar aqui desperdiça o protótipo inteiro. Se a pergunta for de fato ambígua e o usuário não estiver acessível, vá pelo ramo que combina melhor com o código ao redor (um módulo de backend → lógica; uma página ou componente → UI) e declare a suposição no topo do protótipo.

## Regras que valem para os dois

1. **Descartável desde o primeiro dia, e marcado claramente como tal.** Coloque o código do protótipo perto de onde ele vai de fato ser usado (ao lado do módulo ou da página para a qual ele está prototipando), para que o contexto seja óbvio, mas dê a ele um nome que deixe claro para um leitor casual que é um protótipo, não produção. Para rotas de UI descartáveis, siga a convenção de rotas que o projeto já usa; não invente uma nova estrutura de nível superior.
2. **Trivial de rodar.** Um protótipo de UI sobe com um comando no executor de tarefas do projeto: `pnpm <name>`, `python <path>`, `bun <path>` etc. Uma demo de lógica é um único arquivo HTML que o usuário abre com dois cliques. Em qualquer caso, nada de pensar para iniciá-lo.
3. **Sem persistência por padrão.** O estado vive em memória. A persistência é o que o protótipo está _verificando_, não algo de que ele deva depender. Se a pergunta envolver explicitamente um banco de dados, use um banco de rascunho ou um arquivo local com um nome claro do tipo "PROTÓTIPO, pode apagar".
4. **Pule o acabamento.** Sem testes, sem tratamento de erros além do que torna o protótipo _executável_, sem abstrações. A ideia é aprender algo rápido.
5. **Mostre o estado.** Depois de cada ação (lógica) ou a cada troca de variante (UI), imprima ou renderize todo o estado relevante para que o usuário veja o que mudou.
6. **Registre ao terminar.** Incorpore ao código real qualquer decisão validada e depois registre o próprio protótipo como **fonte primária**: faça commit dele num branch descartável, fora da main, e deixe na issue da implementação um ponteiro de contexto para esse branch. Registre também a resposta (o veredito e a pergunta que ele resolveu) na issue ou num commit. O branch main guarda só a decisão validada.
