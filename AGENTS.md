# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Sobre este projeto

Sistema independente de apoio à Reforma Tributária para a Ecotruck: validação de classificação fiscal (NCM/CFOP/CST) de notas fiscais, apuração de crédito tributário e simulação do impacto da transição para IBS/CBS/Imposto Seletivo.

As alíquotas e a tabela de categorias (NCM → alíquota reduzida) ficam no banco (`TabelaAliquota`), editáveis via `/configuracao` — a regulamentação da reforma ainda está em transição, não hardcode alíquotas no motor de regras.

## Módulo de Retenções na Fonte (`/retencoes`)

Apuração de IRRF, PIS/COFINS/CSLL (PCC), INSS e ISS na contratação de serviços,
por item da lista de serviços da LC 116/2003 e por município do tomador.
Dados de origem: `prisma/data/retencoes-fonte-lc116.xlsx` (planilha do
escritório), importados via `npm run import:retencoes` para as tabelas
`ItemServicoLC116`, `RetencaoIssMunicipio`, `MunicipioParticularidade` e
`SimplesNacionalFaixa`. Motor de regras em `lib/retencoes-fonte/apurar.ts`.

**Atenção**: as faixas do Simples Nacional (`SimplesNacionalFaixa`) na planilha-fonte
são anteriores à reforma do Simples de 01/01/2018 (LC 155/2016) — os limites de
faixa (múltiplos de R$120k/R$180k) e alíquotas efetivas mudaram desde então.
Essa tabela é usada apenas como referência exibível, não entra na apuração
automática de IRRF/PCC/INSS. Se for usar para calcular a alíquota de ISS de um
prestador Simples Nacional, confirme as faixas vigentes (Anexo III/IV atuais)
antes de confiar nos valores importados.
