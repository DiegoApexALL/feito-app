/**
 * Gera o "Pix Copia e Cola" (BR Code estático, padrão EMV do Banco Central).
 * O mesmo texto vira o QR Code que o cliente lê no app do banco.
 */

function campo(id: string, valor: string) {
  return id + String(valor.length).padStart(2, '0') + valor;
}

/** CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), exigido pelo BR Code. */
export function crc16(texto: string) {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Remove acentos e caracteres fora do padrão (nome e cidade aceitam só ASCII). */
function limpar(v: string, max: number) {
  return v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .slice(0, max)
    .toUpperCase();
}

export type DadosPix = {
  chave: string;
  nome: string;
  cidade: string;
  valor?: number;
  /** Identificador do pagamento (até 25 letras/números). */
  txid?: string;
  descricao?: string;
};

export function gerarPixCopiaECola({ chave, nome, cidade, valor, txid, descricao }: DadosPix) {
  const conta =
    campo('00', 'br.gov.bcb.pix') +
    campo('01', chave.trim()) +
    (descricao ? campo('02', descricao.slice(0, 40)) : '');
  const id = (txid ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';

  let payload =
    campo('00', '01') +
    campo('26', conta) +
    campo('52', '0000') +
    campo('53', '986') +
    (valor && valor > 0 ? campo('54', valor.toFixed(2)) : '') +
    campo('58', 'BR') +
    campo('59', limpar(nome, 25) || 'RECEBEDOR') +
    campo('60', limpar(cidade, 15) || 'BRASIL') +
    campo('62', campo('05', id)) +
    '6304';
  payload += crc16(payload);
  return payload;
}
