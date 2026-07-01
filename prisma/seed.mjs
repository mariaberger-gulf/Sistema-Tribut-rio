import { PrismaClient } from '../app/generated/prisma/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TABELA_ALIQUOTAS = [
  { prefixoNcm: '', descricao: 'Categoria padrão (catch-all)', categoria: 'padrao' },
  { prefixoNcm: '1006', descricao: 'Arroz (cesta básica)', categoria: 'isenta' },
  { prefixoNcm: '1101', descricao: 'Farinha de trigo (cesta básica)', categoria: 'isenta' },
  { prefixoNcm: '0201', descricao: 'Carne bovina fresca (cesta básica)', categoria: 'isenta' },
  { prefixoNcm: '0713', descricao: 'Feijão (cesta básica)', categoria: 'isenta' },
  { prefixoNcm: '30', descricao: 'Produtos farmacêuticos (saúde)', categoria: 'reduzida60' },
  { prefixoNcm: '9018', descricao: 'Instrumentos e aparelhos médicos (saúde)', categoria: 'reduzida60' },
  { prefixoNcm: '4901', descricao: 'Livros (educação)', categoria: 'isenta' },
  {
    prefixoNcm: '2710',
    descricao: 'Combustíveis derivados de petróleo (Imposto Seletivo)',
    categoria: 'padrao',
    seletivo: true,
    aliquotaSeletivo: 1,
  },
  {
    prefixoNcm: '2402',
    descricao: 'Cigarros e produtos de tabacaria (Imposto Seletivo)',
    categoria: 'padrao',
    seletivo: true,
    aliquotaSeletivo: 25,
  },
  {
    prefixoNcm: '2203',
    descricao: 'Cervejas e bebidas alcoólicas (Imposto Seletivo)',
    categoria: 'padrao',
    seletivo: true,
    aliquotaSeletivo: 10,
  },
  {
    prefixoNcm: '8703',
    descricao: 'Veículos automóveis de passageiros (Imposto Seletivo)',
    categoria: 'padrao',
    seletivo: true,
    aliquotaSeletivo: 5,
  },
];

async function main() {
  const senhaHash = await bcrypt.hash('Maria123', 10);

  await prisma.usuario.upsert({
    where: { email: 'maria.berger@gulf.com.br' },
    update: {},
    create: {
      nome: 'Maria Berger',
      email: 'maria.berger@gulf.com.br',
      senhaHash,
      funcao: 'Admin Master',
      status: 'Ativo',
    },
  });

  await prisma.empresa.upsert({
    where: { cnpj: '00000000000000' },
    update: {},
    create: {
      cnpj: '00000000000000',
      razaoSocial: 'Ecotruck Transportes Ltda',
      nomeFantasia: 'Ecotruck',
      uf: 'SP',
      regimeTributario: 'Lucro Real',
    },
  });

  await prisma.configuracaoReforma.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, aliquotaPadraoCbs: 8.8, aliquotaPadraoIbs: 17.7 },
  });

  for (const item of TABELA_ALIQUOTAS) {
    const existing = await prisma.tabelaAliquota.findFirst({
      where: { prefixoNcm: item.prefixoNcm },
    });
    if (!existing) {
      await prisma.tabelaAliquota.create({ data: item });
    }
  }

  console.log('Seed concluído: usuário admin, empresa Ecotruck, configuração da reforma e tabela de alíquotas.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
