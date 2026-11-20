export const cores = {
  primaria: '#EA580C',
  primariaEscura: '#C2410C',
  primariaSuave: '#FFF1E8',
  tinta: '#16181D',
  texto: '#3A3F4A',
  textoSuave: '#646A75',
  borda: '#E6E3DE',
  fundo: '#F7F5F2',
  superficie: '#FFFFFF',
  sucesso: '#16A34A',
  sucessoSuave: '#E8F7EE',
  erro: '#DC2626',
  erroSuave: '#FDECEC',
  alerta: '#F59E0B',
};

export const raio = { p: 10, m: 16, g: 24, total: 999 };
export const espaco = { xs: 4, s: 8, m: 16, l: 24, xl: 32, xxl: 48 };

export const fonte = {
  titulo: { fontSize: 28, fontWeight: '800' as const, color: cores.tinta, letterSpacing: -0.5 },
  subtitulo: { fontSize: 16, color: cores.textoSuave, lineHeight: 22 },
  rotulo: { fontSize: 14, fontWeight: '600' as const, color: cores.texto },
  corpo: { fontSize: 16, color: cores.texto },
  pequeno: { fontSize: 13, color: cores.textoSuave },
};
