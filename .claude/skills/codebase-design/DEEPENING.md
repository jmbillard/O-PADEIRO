# Aprofundamento

Como aprofundar com segurança um agrupamento de módulos rasos, considerando suas dependências. Pressupõe o vocabulário de [SKILL.md](SKILL.md): **módulo**, **interface**, **costura (seam)**, **adaptador**.

## Categorias de dependência

Ao avaliar um candidato a aprofundamento, classifique suas dependências. A categoria determina como o módulo aprofundado é testado através da sua costura.

### 1. No mesmo processo

Computação pura, estado em memória, sem I/O. Sempre dá para aprofundar: junte os módulos e teste diretamente pela nova interface. Nenhum adaptador necessário.

### 2. Substituível localmente

Dependências que têm substitutos locais para teste (PGLite no lugar do Postgres, sistema de arquivos em memória). Dá para aprofundar se o substituto existir. O módulo aprofundado é testado com o substituto rodando na suíte de testes. A costura é interna; nenhuma porta na interface externa do módulo.

### 3. Remota, mas sua (Portas e Adaptadores)

Seus próprios serviços do outro lado de uma fronteira de rede (microsserviços, APIs internas). Defina uma **porta** (interface) na costura. O módulo profundo é dono da lógica; o transporte é injetado como um **adaptador**. Os testes usam um adaptador em memória. A produção usa um adaptador HTTP/gRPC/fila.

Formato da recomendação: *"Defina uma porta na costura, implemente um adaptador HTTP para produção e um adaptador em memória para teste, para que a lógica fique em um único módulo profundo mesmo sendo implantada através de uma rede."*

### 4. Realmente externa (Mock)

Serviços de terceiros (Stripe, Twilio etc.) que você não controla. O módulo aprofundado recebe a dependência externa como uma porta injetada; os testes fornecem um adaptador mock.

## Disciplina de costuras

- **Um adaptador significa uma costura hipotética. Dois adaptadores significam uma real.** Não introduza uma porta a menos que pelo menos dois adaptadores se justifiquem (normalmente produção + teste). Uma costura com um único adaptador é só indireção.
- **Costuras internas vs costuras externas.** Um módulo profundo pode ter costuras internas (privadas da sua implementação, usadas pelos próprios testes) além da costura externa na sua interface. Não exponha costuras internas pela interface só porque os testes as usam.

## Estratégia de testes: substitua, não empilhe

- Os antigos testes unitários dos módulos rasos viram desperdício assim que existem testes na interface do módulo aprofundado; apague-os.
- Escreva testes novos na interface do módulo aprofundado. A **interface é a superfície de teste**.
- Os testes fazem asserções sobre resultados observáveis pela interface, não sobre estado interno.
- Os testes devem sobreviver a refatorações internas, já que descrevem comportamento, não implementação. Se um teste precisa mudar quando a implementação muda, ele está testando além da interface.
