# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Sobre este projeto

Sistema independente de apoio à Reforma Tributária para a Ecotruck: validação de classificação fiscal (NCM/CFOP/CST) de notas fiscais, apuração de crédito tributário e simulação do impacto da transição para IBS/CBS/Imposto Seletivo.

As alíquotas e a tabela de categorias (NCM → alíquota reduzida) ficam no banco (`TabelaAliquota`), editáveis via `/configuracao` — a regulamentação da reforma ainda está em transição, não hardcode alíquotas no motor de regras.
