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

  const CNAE_PRINCIPAL = { codigo: '80.20-0-01', descricao: 'Atividades de monitoramento de sistemas de segurança eletrônico' };
  const CNAES_SECUNDARIOS = [
    { codigo: '45.20-0-07', descricao: 'Serviços de instalação, manutenção e reparação de acessórios para veículos automotores' },
    { codigo: '47.51-2-01', descricao: 'Comércio varejista especializado de equipamentos e suprimentos de informática' },
    { codigo: '77.39-0-99', descricao: 'Aluguel de outras máquinas e equipamentos comerciais e industriais não especificados anteriormente, sem operador' },
  ];
  const OBJETO_SOCIAL = [
    { descricao: 'Atividades de desenvolvimento de sistemas e monitoramento de frotas, monitoramento de implementos automotivos e monitoramento de implementos agrícolas', origem: 'Alteração 5.1 do Estatuto Social' },
    { descricao: 'Serviços de instalação, manutenção e reparação de acessórios para veículos automotores', origem: 'Alteração 5.1 do Estatuto Social' },
    { descricao: 'Aluguel de equipamentos comerciais e industriais não especificado anteriormente, sem operador', origem: 'Alteração 5.1 do Estatuto Social' },
    { descricao: 'Comercio de componentes eletrônicos e rastreadores', origem: 'Alteração 5.1 do Estatuto Social' },
  ];

  const empresaExistente = await prisma.empresa.findFirst({ where: { OR: [{ cnpj: '00000000000000' }, { cnpj: '46680523000127' }] } });
  const empresa = empresaExistente
    ? await prisma.empresa.update({
        where: { id: empresaExistente.id },
        data: {
          cnpj: '46680523000127',
          cnaePrincipalCodigo: CNAE_PRINCIPAL.codigo,
          cnaePrincipalDescricao: CNAE_PRINCIPAL.descricao,
        },
      })
    : await prisma.empresa.create({
        data: {
          cnpj: '46680523000127',
          razaoSocial: 'Ecotruck Transportes Ltda',
          nomeFantasia: 'Ecotruck',
          uf: 'SP',
          regimeTributario: 'Lucro Real',
          cnaePrincipalCodigo: CNAE_PRINCIPAL.codigo,
          cnaePrincipalDescricao: CNAE_PRINCIPAL.descricao,
        },
      });

  for (const c of CNAES_SECUNDARIOS) {
    await prisma.cnaeSecundario.upsert({
      where: { empresaId_codigo: { empresaId: empresa.id, codigo: c.codigo } },
      update: { descricao: c.descricao },
      create: { empresaId: empresa.id, ...c },
    });
  }

  const objetoExistente = await prisma.objetoSocialItem.count({ where: { empresaId: empresa.id } });
  if (objetoExistente === 0) {
    await prisma.objetoSocialItem.createMany({ data: OBJETO_SOCIAL.map((o) => ({ empresaId: empresa.id, ...o })) });
  }

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
