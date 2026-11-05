# Sincronização das iscas: somente contatos novos

A integração `/api/crm/sheets-sync` cadastra apenas contatos que não existem no CRM.

- Contatos existentes são ignorados: sem editar cadastro, respostas, etiquetas, notas, datas, histórico, compras ou etapa.
- Uma nova aplicação do mesmo contato na planilha também é ignorada por esta integração.
- O telefone normalizado, o ID fixo da aplicação e o vínculo já registrado da linha identificam contatos conhecidos. Na ausência de telefone, permanece a identificação por username e oficina para contatos de Manychat.
- Correspondências ambíguas retornam conflito e ficam pendentes para conferência.
- Apenas contatos novos entram em `Novo lead`, com os dados e a data disponíveis na planilha.
- Os vínculos técnicos das linhas ficam em `crm_state`; registrar um vínculo não modifica o lead existente.

Use a mesma planilha e preserve a coluna `CRM_APLICACAO_ID` ao ordenar ou atualizar os dados. O script `scripts/planilha-iscas-para-crm.gs` mantém a confirmação por aplicação, tenta novamente as falhas e informa quantos contatos novos foram criados e quantos existentes foram ignorados.

Publique a versão atual da API antes de sincronizar. Atualizar o Apps Script permite visualizar os novos contadores; a regra de somente inserir é aplicada pelo servidor, inclusive aos envios do script anterior.

Validação: `node scripts/test-crm-sheets.cjs` cobre reenvios, edições de linhas, aplicações novas de contatos existentes, IDs persistentes, conflitos e importações completas repetidas.
