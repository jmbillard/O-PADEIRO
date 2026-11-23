---
name: wayfinder
description: Planeje um bloco enorme de trabalho (maior do que cabe numa sessão de agente) como um mapa compartilhado de tickets de decisão no seu rastreador de issues, e resolva-os um de cada vez até o caminho para o destino ficar claro.
disable-model-invocation: true
---

Chegou uma ideia solta, grande demais para uma sessão de agente e envolta em névoa: o caminho daqui até o **destino** ainda não está visível. Encontrar o caminho é isso: achar a rota, não sair correndo em direção ao destino. Esta skill traça o caminho como um **mapa compartilhado** no rastreador de issues do repositório e depois trabalha os **tickets de decisão** dele (perguntas cuja resolução é uma decisão, não fatias de uma construção a executar) um de cada vez, até a rota ficar clara.

O destino varia de esforço para esforço, e nomeá-lo é o primeiro ato do traçado: ele molda cada ticket. Pode ser uma especificação (spec) para passar adiante e iterar, uma decisão a travar antes de o planejamento começar, ou uma mudança feita no próprio lugar, como uma migração de estrutura de dados. O mapa não depende de domínio: trabalho de engenharia, conteúdo de curso, o que couber nesse formato.

## Planeje, não execute

O wayfinder é **planejamento** por padrão: cada ticket resolve uma decisão, e o mapa está pronto quando o caminho está claro, sem nada mais a decidir antes de alguém ir lá e fazer a coisa. A vontade de simplesmente fazer o trabalho geralmente é o sinal de que você chegou à borda do mapa e é hora da passagem de bastão (handoff). Um esforço pode mudar isso nas suas **Notes**, levando a execução para dentro do próprio mapa, mas, sem isso, produza decisões, não entregas.

## Refira-se pelo nome

Todo mapa e todo ticket é uma issue, então tem um **nome**: o título. Em tudo o que o humano lê (a narração, o Decisions-so-far do mapa), refira-se a ele por esse nome, nunca por um id, número ou slug solto. Uma parede de `#42, #43, #44` é ilegível; nomes se leem de relance. O id e a URL não somem; o nome envolve o link, mas eles vão _dentro_ do nome, nunca no lugar dele.

## O mapa

O mapa é uma única issue no rastreador de issues deste repositório, com o rótulo `wayfinder:map`, o artefato canônico. Os tickets dele são issues filhas do mapa.

O mapa é um **índice**, não um depósito. Ele lista as decisões tomadas e aponta para os tickets que guardam o detalhe; uma decisão vive em exatamente um lugar, o ticket dela, então o mapa nunca a repete, só resume e linka.

**Onde o mapa, os tickets filhos, os bloqueios e as consultas da fronteira ficam fisicamente depende do rastreador.** O rastreador de issues já deveria ter sido informado a você. Se não foi, diga ao usuário para rodar `/setup-matt-pocock-skills`. Consulte a seção "Wayfinding operations" do documento do rastreador para ver como _este_ repositório expressa essas operações. Se nenhum rastreador tiver sido informado, use por padrão o rastreador em markdown local.

### O corpo do mapa

O mapa inteiro em baixa resolução, carregado uma vez por sessão. Os tickets abertos **não** são listados: são issues filhas abertas, encontradas por consulta.

```markdown
## Destination

<what reaching the end of this map looks like: the spec, decision, or change this effort is finding its way to. One or two lines; every session orients to it before choosing a ticket.>

## Notes

<domain; skills every session should consult; standing preferences for this effort>

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [<closed ticket title>](link): <one-line gist of the answer>

## Not yet specified

<!-- see "Fog of war": in-scope fog you can't ticket yet; graduates as the frontier advances -->

## Out of scope

<!-- see "Out of scope": work ruled beyond the destination; closed, never graduates -->
```

### Tickets

Cada ticket é uma **issue filha** do mapa; o id da issue no rastreador é a identidade dele. O corpo é a pergunta, dimensionada para uma sessão de agente de 100K tokens:

```markdown
## Question

<the decision or investigation this ticket resolves>
```

Cada ticket leva um rótulo `wayfinder:<type>`, um de `research`, `prototype`, `grilling`, `task` (veja [Tipos de ticket](#tipos-de-ticket)). Os rótulos `wayfinder:` são os únicos que um mapa e seus tickets levam, nunca um rótulo de triagem como `ready-for-agent`: são decisões, não trabalho de implementação.

Uma sessão **assume** um ticket atribuindo-o ao dev que está conduzindo o mapa, **primeiro**, antes de qualquer trabalho, para que sessões simultâneas o pulem. Essa atribuição _é_ o ato de assumir: um ticket aberto e sem responsável está livre.

O bloqueio usa a relação de dependência **nativa** do rastreador: isso é essencial porque mostra a fronteira _visualmente_ na própria interface do rastreador, e o humano vê o que dá para pegar sem abrir o mapa. Só um rastreador sem bloqueio nativo recorre a uma convenção no corpo. Um ticket está **desbloqueado** quando todos os tickets que o bloqueiam estão fechados; a **fronteira** são os filhos abertos, desbloqueados e não assumidos, a borda do que se conhece.

A resposta não faz parte do corpo; ela é registrada na resolução (veja [Percorra o mapa](#percorra-o-mapa)). Artefatos criados ao resolver um ticket são linkados a partir da issue, não colados nela.

## Tipos de ticket

Todo ticket é **HITL** (human in the loop, trabalhado _com_ um humano que fala por si mesmo) ou **AFK**, conduzido só pelo agente. Um ticket HITL só se resolve por essa troca ao vivo; o agente nunca faz o papel do humano nela (um agente de interrogatório que responde às próprias perguntas quebrou essa regra).

- **Pesquisa** (AFK): ler documentação, APIs de terceiros ou recursos locais como bases de conhecimento para trazer à tona um fato do qual uma decisão depende. Resolvido por um subagente que chama a ferramenta Skill com "research". Use quando for preciso conhecimento de fora do diretório de trabalho atual.
- **Protótipo** (HITL): eleve a fidelidade da discussão fazendo um artefato barato, grosseiro e concreto para as pessoas reagirem (um esboço, uma versão rascunho, um stub, ou código de UI/lógica) chamando a ferramenta Skill com "prototype". Linka o protótipo como artefato. Use quando "como deveria parecer" ou "como deveria se comportar" é a pergunta-chave.
- **Interrogatório** (HITL): conversa. O caso padrão. Sempre chame a ferramenta Skill duas vezes, com "grilling" e "domain-modeling".
- **Tarefa** (HITL ou AFK): trabalho manual que precisa acontecer antes que uma _decisão_ possa ser tomada: nada a decidir, prototipar ou pesquisar, mas a discussão fica bloqueada até ele ser feito. Criar conta num serviço para poder avaliar a API dele, provisionar acesso, mover dados para ver o formato deles. É o único tipo que _faz_ em vez de decidir, e ele se justifica por desbloquear uma decisão, não por entregar o destino. O agente conduz sozinho quando consegue (AFK); senão, entrega ao humano um checklist preciso (HITL). Resolvido quando o trabalho está feito; a resposta registra o que foi feito e quaisquer fatos resultantes (onde ficam as credenciais, novas URLs, contagens de linhas) dos quais tickets posteriores dependem.

## Névoa de guerra

O mapa é _deliberadamente_ incompleto: não trace o que você ainda não consegue ver. Além dos tickets vivos fica a **névoa de guerra**: a visão turva de decisões e investigações que você percebe que estão vindo, mas ainda não consegue definir, porque dependem de perguntas ainda abertas. Resolver um ticket dissipa a névoa à frente dele, promovendo o que agora dá para especificar a tickets novos, um de cada vez, até o caminho para o destino ficar claro e não restar nenhum ticket.

A seção **Not yet specified** do mapa é onde essa visão turva fica registrada: a pergunta suspeita, a área a revisitar depois. É a fronteira ainda não descoberta _em direção_ ao destino: tudo aqui está no escopo, só não está nítido o bastante para virar ticket. Escreva de forma tão solta ou tão completa quanto a visão permitir; isso também serve de placa de sinalização para colaboradores verem para onde o esforço está indo.

**Névoa ou ticket?** O teste é se você consegue formular a pergunta com precisão agora, _não_ se consegue respondê-la agora.

- **Ticket quando** a pergunta já está nítida, mesmo que esteja bloqueada e você ainda não possa agir sobre ela.
- **Not yet specified quando** você ainda não consegue formulá-la com essa nitidez. Não fatie a névoa de antemão em pedaços do tamanho de um ticket: ela é mais grossa que um ticket, e uma mancha pode virar vários tickets, ou nenhum, quando a fronteira chegar até ela.

O **Not yet specified** exclui o que já está decidido (Decisions so far), o que já é um ticket vivo e o que está fora do escopo (a próxima seção).

## Fora do escopo

A névoa só se acumula _em direção_ ao destino. O destino fixa o escopo, então o trabalho além dele está **fora do escopo**: não é névoa e não pertence ao **Not yet specified**. Ele tem sua própria seção **Out of scope** no mapa: trabalho que você conscientemente excluiu _deste_ esforço. O que o coloca aqui é o escopo, não a nitidez.

Trabalho fora do escopo nunca é promovido (a fronteira para no destino), então ele só volta se o destino for redesenhado, e aí como um esforço novo, não como uma retomada.

Declarar algo fora do escopo é um ato de delimitação, não um passo na rota. Quando um ticket que já existe se revela além do destino (incluído por engano no traçado, ou exposto por uma resolução), **feche-o** (um ticket fechado está, sem ambiguidade, fora da fronteira) e deixe uma linha na seção **Out of scope**: o resumo mais o porquê de estar fora do escopo, linkando o ticket fechado. Ele fica fora do **Decisions so far**, que registra a rota de fato percorrida; um limite de escopo não é um passo nela.

## Invocação

Dois modos. Em qualquer um, **nunca resolva mais de um ticket por sessão**, com exceção dos tickets de pesquisa.

### Trace o mapa

O usuário invoca com uma ideia solta.

1. **Nomeie o destino.** Chame a ferramenta Skill duas vezes, com "grilling" e "domain-modeling", para definir até onde este mapa está buscando o caminho: a spec, a decisão ou a mudança. O destino fixa o escopo, então é resolvido primeiro.
2. **Mapeie a fronteira.** Interrogue de novo, desta vez **em largura**: espalhe-se por todo o espaço em vez de se aprofundar num fio só, trazendo à tona as decisões em aberto e os primeiros passos que já dá para dar. **Se isso não revelar névoa nenhuma** (o caminho para o destino já está claro, a jornada inteira é pequena o bastante para uma sessão), você não precisa de mapa. Pare e pergunte ao usuário como ele quer seguir.
3. **Crie o mapa** (rótulo `wayfinder:map`): Destination e Notes preenchidos, Decisions-so-far vazio, a névoa esboçada em **Not yet specified**.
4. **Crie os tickets que você já consegue especificar** como issues filhas do mapa e depois ligue as arestas de bloqueio numa **segunda passada** (as issues precisam de ids antes de poderem se referenciar). Escreva as referências cruzadas também nessa passada, com ids reais: um `#<n>` provisório vira link automático para uma issue sem relação. A ligação separa os tickets entre a fronteira e os bloqueados; tudo o que você ainda não consegue especificar fica na névoa: a seção **Not yet specified**.
5. **Dispare os subagentes de pesquisa.** Para cada ticket `research` que você acabou de criar, suba um subagente com uma janela de contexto nova que chama a ferramenta Skill com "research" para resolvê-lo em paralelo, guardando as descobertas numa branch descartável `research/<name>`, com um ponteiro de contexto no ticket. Faça push da branch, mas não abra PR: ela nunca é mergeada.
6. Pare: traçar o mapa é o trabalho de uma sessão; ela não resolve nada à mão.

### Percorra o mapa

O usuário invoca com um mapa (URL ou número). O ticket é **opcional**: sem ele, quem escolhe a próxima decisão é você, não o usuário.

1. Carregue o **mapa**: a visão em baixa resolução, não o corpo de cada ticket.
2. Escolha o ticket. Se o usuário nomeou um, use-o. Senão, pegue o primeiro ticket da fronteira, na ordem. **Assuma-o**: atribua a você mesmo antes de qualquer trabalho.
3. Resolva-o conforme o tipo que o rótulo `wayfinder:<type>` indica (veja [Tipos de ticket](#tipos-de-ticket)). Leia o rótulo, não só o corpo: o corpo nunca informa o tipo. **Dê zoom quando precisar**: busque sob demanda o corpo completo de qualquer ticket relacionado ou fechado; chame a ferramenta Skill para as skills que o bloco `## Notes` citar. Na dúvida, chame a ferramenta Skill duas vezes, com "grilling" e "domain-modeling".
4. Registre a resolução: publique a resposta como um **comentário de resolução**, **feche** a issue e **acrescente um ponteiro de contexto** ao Decisions-so-far do mapa.
5. Adicione os tickets que surgiram (criar e depois ligar); promova qualquer névoa que a resposta tenha tornado especificável, tirando cada mancha promovida do **Not yet specified** para que ela viva só como o novo ticket. Se a resposta revelar que um ticket (este ou outro) está além do destino, **declare-o fora do escopo** em vez de resolvê-lo na rota. Se a decisão invalidar outras partes do mapa, atualize ou apague esses tickets.

O usuário pode rodar tickets desbloqueados em paralelo, então espere que outras sessões estejam editando o rastreador ao mesmo tempo.
