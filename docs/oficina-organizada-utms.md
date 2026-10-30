# Rastreamento — Operação: Oficina Organizada

## Links para divulgar

- **Storie:** [Página com UTM](https://www.mensortreinamentos.com.br/oficinaorganizada?utm_source=instagram&utm_medium=story&utm_campaign=oficina_organizada)
- **Manychat:** [Página com UTM](https://www.mensortreinamentos.com.br/oficinaorganizada?utm_source=manychat&utm_medium=automacao&utm_campaign=oficina_organizada)
- **Campanha paga:** [Página com UTM](https://www.mensortreinamentos.com.br/oficinaorganizada?utm_source=meta&utm_medium=paid_social&utm_campaign=oficina_organizada)
- **WhatsApp:** [Página com UTM](https://www.mensortreinamentos.com.br/oficinaorganizada?utm_source=whatsapp&utm_medium=mensagem&utm_campaign=oficina_organizada)

## Checkouts gerados pela página

| Origem | Lote 01 — R$37 | Lote 02 — R$47 | Lote 03 — R$57 |
| --- | --- | --- | --- |
| Storie | [PV - Storie](https://payfast.greenn.com.br/200537/offer/uEHm9j?utm_medium=PV+-+Storie) | [PV - Stories](https://payfast.greenn.com.br/200537/offer/fTygOH?utm_medium=PV+-+Stories) | [PV - Storie](https://payfast.greenn.com.br/200537/offer/7CnUfU?utm_medium=PV+-+Storie) |
| Manychat | [PV - Manychat](https://payfast.greenn.com.br/200537/offer/uEHm9j?utm_medium=PV+-+Manychat) | [PV - Manychat](https://payfast.greenn.com.br/200537/offer/fTygOH?utm_medium=PV+-+Manychat) | [PV - Manychat](https://payfast.greenn.com.br/200537/offer/7CnUfU?utm_medium=PV+-+Manychat) |
| Campanha paga | [PV - Campanha de tráfego](https://payfast.greenn.com.br/200537/offer/uEHm9j?utm_medium=PV+-+Campanha+de+tr%C3%A1fego) | [PV - Campanha de tráfego](https://payfast.greenn.com.br/200537/offer/fTygOH?utm_medium=PV+-+Campanha+de+tr%C3%A1fego) | [PV - Campanha de tráfego](https://payfast.greenn.com.br/200537/offer/7CnUfU?utm_medium=PV+-+Campanha+de+tr%C3%A1fego) |
| WhatsApp | [PV - WhatsApp](https://payfast.greenn.com.br/200537/offer/uEHm9j?utm_medium=PV+-+WhatsApp) | [PV - Whatsapp](https://payfast.greenn.com.br/200537/offer/fTygOH?utm_medium=PV+-+Whatsapp) | [PV - Whatsapp](https://payfast.greenn.com.br/200537/offer/7CnUfU?utm_medium=PV+-+Whatsapp) |

## Calendário

- Lote 01: 28/10 a 03/11 de 2026, até 23h59, por R$37 — oferta `uEHm9j`.
- Lote 02: 04/11 a 12/11 de 2026, até 23h59, por R$47 — oferta `fTygOH`.
- Lote 03: a partir de 13/11 de 2026, por R$57 — oferta `7CnUfU`.
- Fuso: America/Sao_Paulo (UTC−03:00).

## Regras de atribuição

- Todos os sete botões de participação e a faixa vermelha levam diretamente ao checkout rastreado. Nenhum botão de participação usa a âncora da seção de preço.

- O preço e o checkout acompanham automaticamente o lote vigente. O destino é recalculado também no clique.
- O `utm_source` do link de entrada seleciona a origem. A data seleciona qual dos três URLs literais dessa origem será usado.
- Para as quatro origens cadastradas, o checkout usa somente o URL literal fornecido, com seu `utm_medium`. Nenhum `utm_source`, `utm_campaign`, identificador de anúncio ou outro parâmetro é acrescentado ao destino.
- Uma nova visita com UTMs substitui a origem anterior. Uma volta sem UTMs preserva a atribuição da mesma aba via sessionStorage, quando disponível.
- Acesso direto sem atribuição anterior usa o checkout vigente sem inventar uma origem. Fontes desconhecidas mantêm seus próprios parâmetros.
- Os rótulos foram mantidos exatamente como enviados: `PV - Stories` no lote 02 do Instagram; `PV - Whatsapp` nos lotes 02 e 03 do WhatsApp. São diferentes dos rótulos `PV - Storie` e `PV - WhatsApp`.

## Validação

- `node scripts/test-oficina-checkout.cjs`: igualdade exata dos 12 URLs, ausência de parâmetros adicionais, viradas e regras de sessão.
- Conferência no navegador: 12 combinações; HTML inicial sem JavaScript; retorno à página; troca de origem; armazenamento bloqueado; clique na virada de lote.
- Build de produção aprovado.
- A validação confirma os links enviados pelo site. Publicar a alteração e conferir uma compra de teste na Greenn é necessário para confirmar a atribuição no relatório de vendas.
