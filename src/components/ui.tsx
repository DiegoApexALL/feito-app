import { forwardRef, ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cores, espaco, fonte, raio } from '@/theme';
import { avaliarSenha } from '@/lib/validacao';

/* ---------- Tela ---------- */
export function Tela({ children, rodape }: { children: ReactNode; rodape?: ReactNode }) {
  return (
    <SafeAreaView style={s.tela} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.conteudo} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {rodape ? <View style={s.rodape}>{rodape}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Cabecalho({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <View style={{ marginBottom: espaco.l }}>
      <Text style={fonte.titulo}>{titulo}</Text>
      {subtitulo ? <Text style={[fonte.subtitulo, { marginTop: espaco.s }]}>{subtitulo}</Text> : null}
    </View>
  );
}

/* ---------- Botão ---------- */
type BotaoProps = {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'texto';
  carregando?: boolean;
  desabilitado?: boolean;
  estilo?: ViewStyle;
};

export function Botao({ titulo, onPress, variante = 'primario', carregando, desabilitado, estilo }: BotaoProps) {
  const inativo = desabilitado || carregando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inativo, busy: !!carregando }}
      onPress={onPress}
      disabled={inativo}
      style={({ pressed }) => [
        s.botao,
        variante === 'primario' && s.botaoPrimario,
        variante === 'secundario' && s.botaoSecundario,
        variante === 'texto' && s.botaoTexto,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        inativo && { opacity: 0.5 },
        estilo,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={variante === 'primario' ? '#fff' : cores.primaria} />
      ) : (
        <Text
          style={[
            s.botaoRotulo,
            variante !== 'primario' && { color: variante === 'texto' ? cores.primariaEscura : cores.tinta },
          ]}
        >
          {titulo}
        </Text>
      )}
    </Pressable>
  );
}

/* ---------- Campo ---------- */
type CampoProps = TextInputProps & { rotulo: string; erro?: string | null; dica?: string; senha?: boolean };

export const Campo = forwardRef<TextInput, CampoProps>(function Campo({ rotulo, erro, dica, senha, style, ...rest }, ref) {
  const [foco, setFoco] = useState(false);
  const [visivel, setVisivel] = useState(false);
  return (
    <View style={{ marginBottom: espaco.m }}>
      <Text style={[fonte.rotulo, { marginBottom: 6 }]}>{rotulo}</Text>
      <View style={[s.campo, foco && s.campoFoco, !!erro && s.campoErro]}>
        <TextInput
          ref={ref}
          placeholderTextColor={cores.textoSuave}
          secureTextEntry={senha && !visivel}
          autoCapitalize={senha ? 'none' : rest.autoCapitalize}
          autoCorrect={senha ? false : rest.autoCorrect}
          onFocus={(e) => {
            setFoco(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFoco(false);
            rest.onBlur?.(e);
          }}
          style={[s.campoTexto, style]}
          {...rest}
        />
        {senha ? (
          <Pressable onPress={() => setVisivel((v) => !v)} hitSlop={12} accessibilityLabel={visivel ? 'Esconder senha' : 'Mostrar senha'}>
            <Text style={{ color: cores.primariaEscura, fontWeight: '600' }}>{visivel ? 'Ocultar' : 'Mostrar'}</Text>
          </Pressable>
        ) : null}
      </View>
      {erro ? <Text style={s.erroTexto}>{erro}</Text> : dica ? <Text style={[fonte.pequeno, { marginTop: 6 }]}>{dica}</Text> : null}
    </View>
  );
});

/* ---------- Força da senha ---------- */
export function ForcaDaSenha({ senha }: { senha: string }) {
  if (!senha) return null;
  const { nota, rotulo, regras } = avaliarSenha(senha);
  const cor = nota <= 1 ? cores.erro : nota === 2 ? cores.alerta : cores.sucesso;
  return (
    <View style={{ marginTop: -6, marginBottom: espaco.m }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[s.barra, { backgroundColor: i < nota ? cor : cores.borda }]} />
        ))}
      </View>
      <Text style={[fonte.pequeno, { color: cor, fontWeight: '600', marginTop: 6 }]}>{rotulo}</Text>
      {regras.map((r) => (
        <Text key={r.texto} style={[fonte.pequeno, { color: r.ok ? cores.sucesso : cores.textoSuave }]}>
          {r.ok ? '✓' : '○'} {r.texto}
        </Text>
      ))}
    </View>
  );
}

/* ---------- Chip ---------- */
export function Chip({ rotulo, ativo, onPress }: { rotulo: string; ativo: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: ativo }}
      style={[s.chip, ativo && s.chipAtivo]}
    >
      <Text style={[s.chipTexto, ativo && { color: cores.primariaEscura }]}>
        {ativo ? '✓ ' : ''}
        {rotulo}
      </Text>
    </Pressable>
  );
}

/* ---------- Passos do cadastro ---------- */
export function Passos({ atual, total }: { atual: number; total: number }) {
  return (
    <View style={{ marginBottom: espaco.l }}>
      <Text style={[fonte.pequeno, { marginBottom: 8 }]}>
        Passo {atual} de {total}
      </Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={[s.barra, { backgroundColor: i < atual ? cores.primaria : cores.borda }]} />
        ))}
      </View>
    </View>
  );
}

export function Aviso({ texto, tipo = 'erro' }: { texto: string; tipo?: 'erro' | 'sucesso' }) {
  return (
    <View style={[s.aviso, { backgroundColor: tipo === 'erro' ? cores.erroSuave : cores.sucessoSuave }]}>
      <Text style={{ color: tipo === 'erro' ? cores.erro : cores.sucesso, fontWeight: '600' }}>{texto}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.l, paddingTop: espaco.xl, flexGrow: 1 },
  rodape: { padding: espaco.l, paddingTop: espaco.s, backgroundColor: cores.fundo },
  botao: { height: 56, borderRadius: raio.m, alignItems: 'center', justifyContent: 'center', paddingHorizontal: espaco.l },
  botaoPrimario: {
    backgroundColor: cores.primaria,
    shadowColor: cores.primaria,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  botaoSecundario: { backgroundColor: cores.superficie, borderWidth: 1.5, borderColor: cores.borda },
  botaoTexto: { backgroundColor: 'transparent', height: 44 },
  botaoRotulo: { color: '#fff', fontSize: 18, fontWeight: '700' },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: raio.m,
    borderWidth: 1.5,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
    paddingHorizontal: espaco.m,
  },
  campoFoco: { borderColor: cores.primaria },
  campoErro: { borderColor: cores.erro },
  campoTexto: { flex: 1, fontSize: 17, color: cores.tinta, height: '100%' },
  erroTexto: { color: cores.erro, fontSize: 13, marginTop: 6, fontWeight: '500' },
  barra: { flex: 1, height: 5, borderRadius: 3 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: raio.total,
    borderWidth: 1.5,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  chipAtivo: { borderColor: cores.primaria, backgroundColor: cores.primariaSuave },
  chipTexto: { fontSize: 15, fontWeight: '600', color: cores.texto },
  aviso: { padding: espaco.m, borderRadius: raio.m, marginBottom: espaco.m },
});
