import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Aviso, Botao, Cabecalho, Campo, Chip, Passos, Tela } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { cnpjValido, cpfValido, mascaraCep, mascaraDocumento, mascaraTelefone, soDigitos, telefoneValido } from '@/lib/validacao';
import { cores, espaco, fonte, raio } from '@/theme';

const ESPECIALIDADES = [
  'Eletricista',
  'Pedreiro',
  'Encanador',
  'Pintor',
  'Ar-condicionado',
  'Gesseiro',
  'Marceneiro',
  'Serralheiro',
  'Azulejista',
  'Vidraceiro',
  'Jardineiro',
  'Montador de móveis',
  'Chaveiro',
  'Diarista',
  'Outro',
];

type Erros = Partial<Record<'nome' | 'telefone' | 'documento' | 'especialidades' | 'cep' | 'geral', string>>;

export default function Perfil() {
  const { sessao, prestador, recarregarPerfil } = useAuth();
  const onboarding = !prestador?.cadastro_completo;

  const [nome, setNome] = useState(prestador?.nome ?? '');
  const [negocio, setNegocio] = useState(prestador?.nome_negocio ?? '');
  const [telefone, setTelefone] = useState(mascaraTelefone(prestador?.telefone ?? ''));
  const [documento, setDocumento] = useState(mascaraDocumento(prestador?.documento ?? ''));
  const [especialidades, setEspecialidades] = useState<string[]>(prestador?.especialidades ?? []);
  const [cep, setCep] = useState(mascaraCep(prestador?.cep ?? ''));
  const [cidade, setCidade] = useState(prestador?.cidade ?? '');
  const [uf, setUf] = useState(prestador?.uf ?? '');
  const [logoUrl, setLogoUrl] = useState(prestador?.logo_url ?? null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);

  const alternar = (e: string) =>
    setEspecialidades((atual) => (atual.includes(e) ? atual.filter((x) => x !== e) : [...atual, e]));

  async function aoMudarCep(texto: string) {
    const m = mascaraCep(texto);
    setCep(m);
    const d = soDigitos(m);
    if (d.length !== 8) return;
    setBuscandoCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await r.json();
      if (j?.erro) setErros((e) => ({ ...e, cep: 'CEP não encontrado.' }));
      else {
        setCidade(j.localidade ?? '');
        setUf(j.uf ?? '');
        setErros((e) => ({ ...e, cep: undefined }));
      }
    } catch {
      // sem internet: o usuário preenche cidade e UF na mão
    } finally {
      setBuscandoCep(false);
    }
  }

  async function escolherLogo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (r.canceled || !r.assets[0]?.base64 || !sessao) return;
    const a = r.assets[0];
    const tipo = a.mimeType ?? 'image/jpeg';
    const ext = tipo.split('/')[1] ?? 'jpg';
    const caminho = `${sessao.user.id}/logo-${Date.now()}.${ext}`;
    setEnviandoLogo(true);
    const { error } = await supabase.storage.from('logos').upload(caminho, decode(a.base64!), { contentType: tipo, upsert: true });
    setEnviandoLogo(false);
    if (error) return setErros((e) => ({ ...e, geral: 'Não foi possível enviar a logo (máx. 2 MB).' }));
    setLogoUrl(supabase.storage.from('logos').getPublicUrl(caminho).data.publicUrl);
  }

  function validar(): Erros {
    const e: Erros = {};
    if (nome.trim().length < 2) e.nome = 'Informe seu nome.';
    if (!telefoneValido(telefone)) e.telefone = 'WhatsApp com DDD.';
    const doc = soDigitos(documento);
    if (doc && !(doc.length === 11 ? cpfValido(doc) : cnpjValido(doc))) e.documento = 'CPF ou CNPJ inválido.';
    if (!especialidades.length) e.especialidades = 'Escolha pelo menos uma.';
    if (cep && soDigitos(cep).length !== 8) e.cep = 'CEP incompleto.';
    return e;
  }

  async function salvar() {
    const e = validar();
    setErros(e);
    if (Object.keys(e).length || !sessao) return;
    const doc = soDigitos(documento);
    setSalvando(true);
    const { error } = await supabase
      .from('prestadores')
      .update({
        nome: nome.trim(),
        nome_negocio: negocio.trim() || null,
        telefone: soDigitos(telefone),
        documento: doc || null,
        tipo_documento: doc ? (doc.length === 11 ? 'cpf' : 'cnpj') : null,
        especialidades,
        cep: soDigitos(cep) || null,
        cidade: cidade.trim() || null,
        uf: uf.trim().toUpperCase() || null,
        logo_url: logoUrl,
      })
      .eq('id', sessao.user.id);
    setSalvando(false);
    if (error) return setErros({ geral: 'Não foi possível salvar. Tente de novo.' });
    await recarregarPerfil();
    if (onboarding) router.push('/pagamento');
    else router.back();
  }

  return (
    <Tela rodape={<Botao titulo={onboarding ? 'Continuar' : 'Salvar alterações'} onPress={salvar} carregando={salvando} />}>
      {onboarding ? <Passos atual={1} total={2} /> : null}
      <Cabecalho
        titulo={onboarding ? 'Seu negócio' : 'Meu perfil'}
        subtitulo="Essas informações aparecem no cabeçalho dos seus orçamentos."
      />
      {erros.geral ? <Aviso texto={erros.geral} /> : null}

      <Pressable onPress={escolherLogo} style={s.logoBox} accessibilityRole="button" accessibilityLabel="Escolher logo">
        {enviandoLogo ? (
          <ActivityIndicator color={cores.primaria} />
        ) : logoUrl ? (
          <Image source={{ uri: logoUrl }} style={s.logoImg} />
        ) : (
          <Text style={{ fontSize: 28 }}>📷</Text>
        )}
        <View style={{ flex: 1 }}>
          <Text style={fonte.rotulo}>{logoUrl ? 'Trocar logo' : 'Adicionar logo'}</Text>
          <Text style={fonte.pequeno}>Opcional · deixa seu orçamento com cara de empresa</Text>
        </View>
      </Pressable>

      <Campo rotulo="Seu nome" value={nome} onChangeText={setNome} autoCapitalize="words" erro={erros.nome} />
      <Campo
        rotulo="Nome do negócio (opcional)"
        placeholder="Ex.: JS Elétrica"
        value={negocio}
        onChangeText={setNegocio}
        autoCapitalize="words"
      />
      <Campo
        rotulo="WhatsApp"
        value={telefone}
        onChangeText={(t) => setTelefone(mascaraTelefone(t))}
        keyboardType="phone-pad"
        erro={erros.telefone}
      />
      <Campo
        rotulo="CPF ou CNPJ (opcional)"
        placeholder="000.000.000-00"
        value={documento}
        onChangeText={(t) => setDocumento(mascaraDocumento(t))}
        keyboardType="number-pad"
        erro={erros.documento}
        dica="Aparece no orçamento e passa mais confiança."
      />

      <Text style={[fonte.rotulo, { marginBottom: espaco.s }]}>O que você faz?</Text>
      <View style={s.chips}>
        {ESPECIALIDADES.map((e) => (
          <Chip key={e} rotulo={e} ativo={especialidades.includes(e)} onPress={() => alternar(e)} />
        ))}
      </View>
      {erros.especialidades ? <Text style={s.erro}>{erros.especialidades}</Text> : null}

      <View style={{ height: espaco.l }} />
      <Campo
        rotulo="CEP onde você atende"
        placeholder="00000-000"
        value={cep}
        onChangeText={aoMudarCep}
        keyboardType="number-pad"
        erro={erros.cep}
        dica={buscandoCep ? 'Buscando cidade…' : undefined}
      />
      <View style={{ flexDirection: 'row', gap: espaco.s }}>
        <View style={{ flex: 1 }}>
          <Campo rotulo="Cidade" value={cidade} onChangeText={setCidade} autoCapitalize="words" />
        </View>
        <View style={{ width: 84 }}>
          <Campo rotulo="UF" value={uf} onChangeText={(t) => setUf(t.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase())} autoCapitalize="characters" />
        </View>
      </View>
    </Tela>
  );
}

const s = StyleSheet.create({
  logoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.m,
    padding: espaco.m,
    borderRadius: raio.m,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: cores.primaria,
    backgroundColor: cores.primariaSuave,
    marginBottom: espaco.l,
  },
  logoImg: { width: 56, height: 56, borderRadius: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.s },
  erro: { color: cores.erro, fontSize: 13, marginTop: 6, fontWeight: '500' },
});
