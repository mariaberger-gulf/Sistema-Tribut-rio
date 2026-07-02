import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '../app/generated/prisma/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();
const wb = XLSX.readFile(path.join(__dirname, 'data', 'retencoes-fonte-lc116.xlsx'));

function baseCodigo(raw) {
  const m = String(raw ?? '').trim().match(/^(\d+\.\d+)/);
  return m ? m[1] : null;
}

function texto(v, fallback = '—') {
  const s = String(v ?? '').trim();
  return s === '' ? fallback : s;
}

async function lerPrevidencia() {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['Previdência Social'], { header: 1, range: 9 });
  const mapa = new Map();
  for (const row of rows) {
    const [, descComCodigo, retencao, obs] = row;
    const s = String(descComCodigo ?? '').trim();
    const m = s.match(/^(\d+\.\d+)\s*-?\s*(.*)$/);
    if (!m) continue;
    const codigoBase = m[1];
    if (!mapa.has(codigoBase)) {
      mapa.set(codigoBase, { inss: texto(retencao), observacaoInss: texto(obs, '') });
    }
  }
  return mapa;
}

async function importarItensServico() {
  const previdencia = await lerPrevidencia();
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['Retenções Federais (IR-PCC)'], { header: 1, range: 1 });
  let grupoDescricao = '';
  const itens = [];
  const vistos = new Set();

  for (const row of rows) {
    const [itemRaw, descricao, pis, cofins, csll, irrf15, irrf10, obs] = row;
    if (!itemRaw) continue;
    const codigo = String(itemRaw).trim();
    const codigoBase = baseCodigo(codigo);

    if (!codigoBase) {
      const m = codigo.match(/^\d+\s*-\s*(.*)$/);
      if (m) grupoDescricao = m[1].trim();
      continue;
    }
    if (vistos.has(codigo)) continue;
    vistos.add(codigo);

    const prev = previdencia.get(codigoBase) ?? { inss: '—', observacaoInss: '' };
    itens.push({
      codigo,
      codigoBase,
      itemGrupo: codigoBase.split('.')[0],
      grupoDescricao,
      descricao: texto(descricao, ''),
      pis: texto(pis),
      cofins: texto(cofins),
      csll: texto(csll),
      irrf15: texto(irrf15),
      irrf10: texto(irrf10),
      observacaoFederal: texto(obs, ''),
      inss: prev.inss,
      observacaoInss: prev.observacaoInss,
    });
  }

  await prisma.itemServicoLC116.deleteMany({});
  await prisma.itemServicoLC116.createMany({ data: itens });
  console.log(`Itens de serviço (LC 116) importados: ${itens.length}`);
}

async function importarIss() {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['ISS (referência)'], { header: 1, range: 4 });
  const registros = [];
  const vistos = new Set();

  for (const row of rows) {
    const [municipio, codigoRaw, descricao, aliquota, retencao, observacao] = row;
    if (!municipio || municipio === 'MUNICÍPIO') continue;
    const codigoBase = baseCodigo(codigoRaw);
    if (!codigoBase) continue;
    const chave = `${municipio}|${codigoBase}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);

    const aliqNum = typeof aliquota === 'number' ? aliquota : null;
    registros.push({
      municipio: String(municipio).trim(),
      codigoBase,
      descricao: texto(descricao, ''),
      aliquota: aliqNum,
      retencao: texto(retencao, '—'),
      observacao: texto(observacao, ''),
    });
  }

  await prisma.retencaoIssMunicipio.deleteMany({});
  const TAMANHO_LOTE = 1000;
  for (let i = 0; i < registros.length; i += TAMANHO_LOTE) {
    await prisma.retencaoIssMunicipio.createMany({ data: registros.slice(i, i + TAMANHO_LOTE) });
  }
  console.log(`Regras de ISS por município importadas: ${registros.length}`);
}

async function importarParticularidades() {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['Particularidades Munic.'], { header: 1, range: 1 });
  const registros = [];
  for (const row of rows) {
    const [municipio, particularidade] = row;
    const p = String(particularidade ?? '').trim();
    if (!municipio || p === '' || p === '-') continue;
    registros.push({ municipio: String(municipio).trim(), particularidade: p });
  }
  await prisma.municipioParticularidade.deleteMany({});
  await prisma.municipioParticularidade.createMany({ data: registros });
  console.log(`Particularidades municipais importadas: ${registros.length}`);
}

function parseFaixa(rotulo) {
  const s = String(rotulo).replace(/\./g, '').replace(/,/g, '.').trim();
  if (/^Até/i.test(s)) {
    const max = parseFloat(s.match(/[\d.]+/)[0]);
    return { min: 0, max };
  }
  const m = s.match(/([\d.]+)\s*a\s*([\d.]+)/i);
  if (m) return { min: parseFloat(m[1]), max: parseFloat(m[2]) };
  return { min: 0, max: null };
}

async function importarSimplesNacional() {
  const all = XLSX.utils.sheet_to_json(wb.Sheets['Simples Nacional'], { header: 1 });
  const registros = [];

  // Anexo III (linhas 11-30, índice 0-based 10-29): faixas de R$120k
  for (let i = 10; i <= 29; i++) {
    const row = all[i];
    if (!row || !row[0]) continue;
    const { min, max } = parseFaixa(row[0]);
    registros.push({ anexo: 'III', faixaMin: min, faixaMax: max, aliquotaNominal: row[1], irpj: row[2], csll: row[3], cofins: row[4], pis: row[5], iss: row[6] });
  }
  // Anexo IV (linhas 37-56, índice 0-based 36-55): faixas de R$180k
  for (let i = 36; i <= 55; i++) {
    const row = all[i];
    if (!row || !row[0]) continue;
    const { min, max } = parseFaixa(row[0]);
    registros.push({ anexo: 'IV', faixaMin: min, faixaMax: max, aliquotaNominal: row[1], irpj: row[2], csll: row[3], cofins: row[4], pis: row[5], iss: row[6] });
  }

  await prisma.simplesNacionalFaixa.deleteMany({});
  await prisma.simplesNacionalFaixa.createMany({ data: registros });
  console.log(`Faixas do Simples Nacional importadas: ${registros.length} (ATENÇÃO: tabela do arquivo-fonte é anterior à reforma do Simples de 01/01/2018 — conferir vigência antes de usar para novas emissões)`);
}

async function main() {
  await importarItensServico();
  await importarIss();
  await importarParticularidades();
  await importarSimplesNacional();
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
