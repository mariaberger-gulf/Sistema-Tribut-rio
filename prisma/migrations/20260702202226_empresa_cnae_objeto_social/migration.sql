-- AlterTable
ALTER TABLE "empresas" ADD COLUMN     "cnaePrincipalCodigo" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "cnaePrincipalDescricao" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "cnaes_secundarios" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "cnaes_secundarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objeto_social_itens" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "origem" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "objeto_social_itens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cnaes_secundarios_empresaId_codigo_key" ON "cnaes_secundarios"("empresaId", "codigo");

-- AddForeignKey
ALTER TABLE "cnaes_secundarios" ADD CONSTRAINT "cnaes_secundarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objeto_social_itens" ADD CONSTRAINT "objeto_social_itens_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
