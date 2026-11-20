/**
 * Transforma o que o prestador falou/digitou em itens do orçamento, sem precisar de IA.
 *
 * Exemplo: "troquei 3 tomadas a 50 cada, 10 metros de fio por 45 e mão de obra 200"
 *   → Troca de tomadas (3 un × R$ 50) · Fio (10 m, R$ 45) · Mão de obra (R$ 200)
 */

export type ItemMontado = {
  tipo: 'servico' | 'material';
  descricao: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
};

const NUMEROS_ESCRITOS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  onze: 11, doze: 12, quinze: 15, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, cem: 100, meia: 0.5,
};

const UNIDADES: [RegExp, string][] = [
  [/^(metros?|m)$/, 'm'],
  [/^(m2|m²|metros? quadrados?)$/, 'm²'],
  [/^(quilos?|kg)$/, 'kg'],
  [/^(litros?|l)$/, 'L'],
  [/^(sacos?)$/, 'saco'],
  [/^(latas?|galao|galoes|galões)$/, 'lata'],
  [/^(rolos?)$/, 'rolo'],
  [/^(caixas?|cx)$/, 'cx'],
  [/^(horas?|h)$/, 'h'],
  [/^(diarias?|diárias?|dias?)$/, 'dia'],
  [/^(pecas?|peças?|unidades?|un|pcs?)$/, 'un'],
];

const VERBOS_SERVICO =
  /\b(troquei|trocar|troca|instalei|instalar|instalação|instalacao|consertei|consertar|conserto|reparo|reparei|pintei|pintar|pintura|limpei|limpeza|montei|montagem|fiz|fazer|passei|desentupi|desentupimento|assentei|assentamento|reboco|rebocar|manutenção|manutencao|revisão|revisao|visita|mão de obra|mao de obra|serviço|servico)\b/i;

const PISTAS_MATERIAL =
  /\b(comprei|material|materiais|fio|fios|cabo|cabos|cimento|areia|tinta|massa|cano|canos|tubo|tubos|conexão|conexoes|conexões|joelho|parafuso|parafusos|bucha|buchas|disjuntor|disjuntores|lâmpada|lampada|lâmpadas|lampadas|argamassa|rejunte|piso|azulejo|tijolo|tijolos|bloco|blocos|gesso|registro|torneira|sifão|sifao|fita|cola|gás|gas)\b/i;

const VERBO_INICIAL = /^(troquei|instalei|consertei|pintei|limpei|montei|fiz|passei|desentupi|assentei|comprei|usei|coloquei|botei|gastei)\s+/i;

const NOMINALIZAR: Record<string, string> = {
  troquei: 'Troca de',
  instalei: 'Instalação de',
  consertei: 'Conserto de',
  pintei: 'Pintura de',
  limpei: 'Limpeza de',
  montei: 'Montagem de',
  desentupi: 'Desentupimento de',
  assentei: 'Assentamento de',
  passei: 'Passagem de',
};

function semAcento(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** "1.250,50" | "1250.5" | "250" → número */
function paraNumero(t: string) {
  const s = t.trim();
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return Number(s.replace(/\./g, '').replace(',', '.'));
  return Number(s.replace(',', '.'));
}

function separarTrechos(texto: string) {
  return texto
    .replace(/\s+/g, ' ')
    .split(/\s*(?:[;\n]|,(?!\d)|\.(?!\d)|\s+e\s+(?=(?:mais\s+)?(?:\d|um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|m[aã]o de obra|troquei|instalei|consertei|pintei|limpei|montei|fiz|passei|comprei|usei|coloquei|desentupi|assentei|o |a |os |as |mais\b)))\s*/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
}

/** Primeira letra maiúscula, sem espaços sobrando. */
function capitalizar(s: string) {
  const t = s.trim().replace(/\s+/g, ' ');
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}

export function montarItens(texto: string): ItemMontado[] {
  const itens: ItemMontado[] = [];

  for (const trechoOriginal of separarTrechos(texto)) {
    let t = ` ${trechoOriginal} `;
    let valor: number | null = null;
    let valorEhTotal = true;

    // Preço: "R$ 50", "50 reais", "por 50", "a 50 cada", "cobrei 200", "ficou 120"
    const rePreco =
      /(?:r\$\s*(\d[\d.,]*)|(\d[\d.,]*)\s*(?:reais|real|conto|contos|pila)\b|\b(?:por|a|de|cobrei|cobro|cobrar|ficou|fica|deu|custou|sai|valor(?: de)?|total(?: de)?)\s+(\d[\d.,]*)(?!\s*(?:metros?|m\b|m2|m²|kg|quilos?|litros?|sacos?|latas?|rolos?|caixas?|horas?|h\b|dias?|unidades?|pe[cç]as?)))\s*(cada|a unidade|por unidade|o metro|por metro|a hora|por hora|o saco|por saco|a diária|por dia)?/i;
    const mp = t.match(rePreco);
    if (mp) {
      valor = paraNumero(mp[1] ?? mp[2] ?? mp[3]);
      valorEhTotal = !mp[4];
      t = t.replace(mp[0], ' ');
    } else {
      // número solto no fim do trecho é o preço: "mão de obra 200", "fio 45"
      const mf = t.match(/\s(\d[\d.,]*)\s*$/);
      if (mf) {
        valor = paraNumero(mf[1]);
        t = t.slice(0, mf.index) + ' ';
      }
    }

    // Quantidade + unidade: "3 tomadas", "10 metros de fio", "duas latas"
    let quantidade = 1;
    let unidade = 'un';
    const reQtd = new RegExp(
      `\\b(\\d+(?:[.,]\\d+)?|${Object.keys(NUMEROS_ESCRITOS).join('|')}|três)\\s+(metros? quadrados?|m2|m²|metros?|m|quilos?|kg|litros?|l|sacos?|latas?|gal[aã]o|gal[oõ]es|rolos?|caixas?|cx|horas?|h|di[aá]rias?|dias?|pe[cç]as?|unidades?|un|pcs?)?\\b`,
      'i',
    );
    const mq = t.match(reQtd);
    if (mq) {
      const bruto = semAcento(mq[1].toLowerCase());
      const n = NUMEROS_ESCRITOS[bruto] ?? paraNumero(bruto);
      if (n > 0 && n < 100000) {
        quantidade = n;
        if (mq[2]) {
          const u = semAcento(mq[2].toLowerCase());
          unidade = UNIDADES.find(([re]) => re.test(u) || re.test(mq[2].toLowerCase()))?.[1] ?? 'un';
        }
        t = t.replace(mq[0], ' ');
      }
    }

    // Tipo
    const original = trechoOriginal.toLowerCase();
    const ehMaoDeObra = /m[aã]o de obra|servi[cç]o|visita|di[aá]ria/.test(original);
    const tipo: ItemMontado['tipo'] =
      ehMaoDeObra ? 'servico'
      : /\bcomprei\b|material/.test(original) ? 'material'
      : VERBOS_SERVICO.test(original) ? 'servico'
      : PISTAS_MATERIAL.test(original) || unidade !== 'un' ? 'material'
      : 'servico';

    // Descrição limpa
    let desc = t.replace(/\s+/g, ' ').trim();
    const mv = desc.match(VERBO_INICIAL);
    if (mv) {
      const verbo = semAcento(mv[1].toLowerCase());
      desc = desc.slice(mv[0].length);
      desc = desc.replace(/^(de|do|da|dos|das|o|a|os|as)\s+/i, '');
      if (tipo === 'servico' && NOMINALIZAR[verbo]) desc = `${NOMINALIZAR[verbo]} ${desc}`;
    }
    desc = desc
      .replace(/^(de|do|da|dos|das|o|a|os|as|mais|e)\s+/i, '')
      .replace(/\s+(de|do|da|por|a|e|com)$/i, '')
      .replace(/^(de|do|da)\s+/i, '');
    if (!desc || /^(de|e)$/i.test(desc)) desc = tipo === 'servico' ? 'Mão de obra' : 'Material';
    desc = capitalizar(desc);

    const valorUnit = valor == null ? 0 : valorEhTotal ? Math.round((valor / quantidade) * 100) / 100 : valor;

    itens.push({ tipo, descricao: desc.slice(0, 300), quantidade, unidade, valor_unitario: valorUnit });
  }

  return itens;
}
