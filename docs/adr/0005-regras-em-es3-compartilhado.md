# As regras do domínio ficam em arquivos ES3 compartilhados

A regra do renomear, achar a atração pela claquete e os tokens do caminho chegaram a existir em três cópias (host,
painel e host de teste), e as cópias divergiam. Cada regra pura passa a existir uma vez só, num arquivo em
`extension/regras/`, escrito em ES3 e sem After nem DOM: o host carrega por `#include`, o painel por `<script>` e os
testes em Node por `require`. A alternativa, levar as regras para o painel em JS moderno e deixar o host só receber o
resultado, foi descartada: o etiquetador, o preencher e o plano B do host (ADR 0003) precisam calcular sozinhos dentro
do After. O preço é escrever essas regras em ES3 também no painel.
