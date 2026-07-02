-- AlterTable
ALTER TABLE "empresas" ADD COLUMN     "municipio" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "itens_servico_lc116" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "codigoBase" TEXT NOT NULL,
    "itemGrupo" TEXT NOT NULL,
    "grupoDescricao" TEXT NOT NULL DEFAULT '',
    "descricao" TEXT NOT NULL,
    "pis" TEXT NOT NULL,
    "cofins" TEXT NOT NULL,
    "csll" TEXT NOT NULL,
    "irrf15" TEXT NOT NULL,
    "irrf10" TEXT NOT NULL,
    "observacaoFederal" TEXT NOT NULL DEFAULT '',
    "inss" TEXT NOT NULL DEFAULT 'NA',
    "observacaoInss" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itens_servico_lc116_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retencoes_iss_municipio" (
    "id" SERIAL NOT NULL,
    "municipio" TEXT NOT NULL,
    "codigoBase" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "aliquota" DOUBLE PRECISION,
    "retencao" TEXT NOT NULL,
    "observacao" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "retencoes_iss_municipio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "municipio_particularidades" (
    "id" SERIAL NOT NULL,
    "municipio" TEXT NOT NULL,
    "particularidade" TEXT NOT NULL,

    CONSTRAINT "municipio_particularidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simples_nacional_faixas" (
    "id" SERIAL NOT NULL,
    "anexo" TEXT NOT NULL,
    "faixaMin" DOUBLE PRECISION NOT NULL,
    "faixaMax" DOUBLE PRECISION,
    "aliquotaNominal" DOUBLE PRECISION NOT NULL,
    "irpj" DOUBLE PRECISION NOT NULL,
    "csll" DOUBLE PRECISION NOT NULL,
    "cofins" DOUBLE PRECISION NOT NULL,
    "pis" DOUBLE PRECISION NOT NULL,
    "iss" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "simples_nacional_faixas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "itens_servico_lc116_codigo_key" ON "itens_servico_lc116"("codigo");

-- CreateIndex
CREATE INDEX "retencoes_iss_municipio_municipio_idx" ON "retencoes_iss_municipio"("municipio");

-- CreateIndex
CREATE UNIQUE INDEX "retencoes_iss_municipio_municipio_codigoBase_key" ON "retencoes_iss_municipio"("municipio", "codigoBase");

-- CreateIndex
CREATE UNIQUE INDEX "municipio_particularidades_municipio_key" ON "municipio_particularidades"("municipio");
