-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "funcao" TEXT NOT NULL DEFAULT 'Usuário',
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas" (
    "id" SERIAL NOT NULL,
    "cnpj" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT NOT NULL DEFAULT '',
    "uf" TEXT NOT NULL,
    "regimeTributario" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas_fiscais" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER,
    "chaveAcesso" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "dataEmissao" TIMESTAMP(3) NOT NULL,
    "tpNF" INTEGER NOT NULL,
    "idDest" INTEGER NOT NULL,
    "finNFe" INTEGER NOT NULL,
    "naturezaOperacao" TEXT NOT NULL DEFAULT '',
    "emitCnpj" TEXT NOT NULL,
    "emitNome" TEXT NOT NULL,
    "emitUf" TEXT NOT NULL,
    "emitCrt" INTEGER NOT NULL,
    "destCnpj" TEXT NOT NULL,
    "destNome" TEXT NOT NULL,
    "destUf" TEXT NOT NULL,
    "valorProdutos" DOUBLE PRECISION NOT NULL,
    "valorIcms" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorIpi" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorPis" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorCofins" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "xmlBruto" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Processada',
    "erroProcessamento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notas_fiscais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_nota_fiscal" (
    "id" SERIAL NOT NULL,
    "notaFiscalId" INTEGER NOT NULL,
    "numeroItem" INTEGER NOT NULL,
    "codigoProduto" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "ncm" TEXT NOT NULL,
    "cest" TEXT NOT NULL DEFAULT '',
    "cfop" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "valorUnitario" DOUBLE PRECISION NOT NULL,
    "valorProduto" DOUBLE PRECISION NOT NULL,
    "origem" INTEGER NOT NULL DEFAULT 0,
    "cst" TEXT NOT NULL DEFAULT '',
    "csosn" TEXT NOT NULL DEFAULT '',
    "modBC" INTEGER NOT NULL DEFAULT 0,
    "icmsBase" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "icmsAliquota" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "icmsValor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "icmsStBase" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "icmsStAliquota" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "icmsStValor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fcpAliquota" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ipiCst" TEXT NOT NULL DEFAULT '',
    "ipiBase" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ipiAliquota" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ipiValor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pisCst" TEXT NOT NULL DEFAULT '',
    "pisBase" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pisAliquota" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pisValor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cofinsCst" TEXT NOT NULL DEFAULT '',
    "cofinsBase" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cofinsAliquota" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cofinsValor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itens_nota_fiscal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validacoes_classificacao" (
    "id" SERIAL NOT NULL,
    "itemNotaFiscalId" INTEGER NOT NULL,
    "regra" TEXT NOT NULL,
    "severidade" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validacoes_classificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creditos_tributarios" (
    "id" SERIAL NOT NULL,
    "itemNotaFiscalId" INTEGER NOT NULL,
    "tipoImposto" TEXT NOT NULL,
    "elegivel" BOOLEAN NOT NULL,
    "valorCredito" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "motivo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creditos_tributarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulacoes_reforma" (
    "id" SERIAL NOT NULL,
    "itemNotaFiscalId" INTEGER NOT NULL,
    "anoReferencia" INTEGER NOT NULL,
    "categoriaAliquota" TEXT NOT NULL,
    "aliquotaCbs" DOUBLE PRECISION NOT NULL,
    "aliquotaIbs" DOUBLE PRECISION NOT NULL,
    "aliquotaIs" DOUBLE PRECISION NOT NULL,
    "valorCbs" DOUBLE PRECISION NOT NULL,
    "valorIbs" DOUBLE PRECISION NOT NULL,
    "valorIs" DOUBLE PRECISION NOT NULL,
    "valorAtual" DOUBLE PRECISION NOT NULL,
    "valorReforma" DOUBLE PRECISION NOT NULL,
    "delta" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulacoes_reforma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabela_aliquotas" (
    "id" SERIAL NOT NULL,
    "prefixoNcm" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "seletivo" BOOLEAN NOT NULL DEFAULT false,
    "aliquotaSeletivo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tabela_aliquotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracao_reforma" (
    "id" SERIAL NOT NULL,
    "aliquotaPadraoCbs" DOUBLE PRECISION NOT NULL DEFAULT 8.8,
    "aliquotaPadraoIbs" DOUBLE PRECISION NOT NULL DEFAULT 17.7,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracao_reforma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cnpj_key" ON "empresas"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "notas_fiscais_chaveAcesso_key" ON "notas_fiscais"("chaveAcesso");

-- AddForeignKey
ALTER TABLE "notas_fiscais" ADD CONSTRAINT "notas_fiscais_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_nota_fiscal" ADD CONSTRAINT "itens_nota_fiscal_notaFiscalId_fkey" FOREIGN KEY ("notaFiscalId") REFERENCES "notas_fiscais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validacoes_classificacao" ADD CONSTRAINT "validacoes_classificacao_itemNotaFiscalId_fkey" FOREIGN KEY ("itemNotaFiscalId") REFERENCES "itens_nota_fiscal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creditos_tributarios" ADD CONSTRAINT "creditos_tributarios_itemNotaFiscalId_fkey" FOREIGN KEY ("itemNotaFiscalId") REFERENCES "itens_nota_fiscal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulacoes_reforma" ADD CONSTRAINT "simulacoes_reforma_itemNotaFiscalId_fkey" FOREIGN KEY ("itemNotaFiscalId") REFERENCES "itens_nota_fiscal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
