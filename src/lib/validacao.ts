export const soDigitos = (v: string) => v.replace(/\D/g, '');

export function mascaraTelefone(v: string) {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function mascaraDocumento(v: string) {
  const d = soDigitos(v).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export const mascaraCep = (v: string) => soDigitos(v).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');

/** Erros de digitação comuns no domínio do e-mail. Devolve a sugestão ou null. */
const DOMINIOS_CERTOS: Record<string, string> = {
  'gmail.com.br': 'gmail.com', 'gmal.com': 'gmail.com', 'gmial.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com',
  'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.om': 'gmail.com', 'gmaill.com': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmail.co': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outlook.com.br': 'outlook.com', 'outlook.con': 'outlook.com',
  'yahoo.con': 'yahoo.com', 'yaho.com': 'yahoo.com', 'icloud.con': 'icloud.com', 'icoud.com': 'icloud.com',
};

export function sugerirEmail(e: string): string | null {
  const [usuario, dominio] = e.trim().toLowerCase().split('@');
  if (!usuario || !dominio) return null;
  const certo = DOMINIOS_CERTOS[dominio];
  return certo ? `${usuario}@${certo}` : null;
}

export const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

export const telefoneValido = (t: string) => {
  const d = soDigitos(t);
  return d.length === 10 || d.length === 11;
};

export function cpfValido(v: string) {
  const c = soDigitos(v);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  const dv = (base: string, peso: number) => {
    let s = 0;
    for (const n of base) s += Number(n) * peso--;
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(c.slice(0, 9), 10) === Number(c[9]) && dv(c.slice(0, 10), 11) === Number(c[10]);
}

export function cnpjValido(v: string) {
  const c = soDigitos(v);
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const dv = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const s = [...base].reduce((acc, n, i) => acc + Number(n) * pesos[i], 0);
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(c.slice(0, 12)) === Number(c[12]) && dv(c.slice(0, 13)) === Number(c[13]);
}

export type ForcaSenha = { nota: 0 | 1 | 2 | 3 | 4; rotulo: string; regras: { ok: boolean; texto: string }[] };

export function avaliarSenha(s: string): ForcaSenha {
  const regras = [
    { ok: s.length >= 8, texto: 'Pelo menos 8 caracteres' },
    { ok: /[a-zA-Z]/.test(s) && /\d/.test(s), texto: 'Letras e números' },
    { ok: /[A-Z]/.test(s) && /[a-z]/.test(s), texto: 'Maiúscula e minúscula' },
    { ok: /[^A-Za-z0-9]/.test(s), texto: 'Um símbolo (!@#…)' },
  ];
  const nota = regras.filter((r) => r.ok).length as ForcaSenha['nota'];
  const rotulo = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'][nota];
  return { nota, rotulo, regras };
}

/** Mínimo aceito para cadastrar: 8+ caracteres com letras e números. */
export const senhaAceita = (s: string) => {
  const { regras } = avaliarSenha(s);
  return regras[0].ok && regras[1].ok;
};

/** Traduz as mensagens de erro do Supabase Auth. */
export function traduzErroAuth(msg?: string) {
  if (!msg) return 'Algo deu errado. Tente de novo.';
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Este e-mail já tem cadastro. Tente entrar.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Muitas tentativas. Aguarde alguns minutos.';
  if (m.includes('weak') || m.includes('pwned') || m.includes('leaked')) return 'Essa senha é fraca ou já vazou na internet. Escolha outra.';
  if (m.includes('network')) return 'Sem conexão. Verifique sua internet.';
  return 'Algo deu errado. Tente de novo.';
}
