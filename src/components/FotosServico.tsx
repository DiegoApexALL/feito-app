import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { reduzirImagem } from '@/lib/imagem';
import { Foto, supabase } from '@/lib/supabase';
import { cores, espaco, fonte, raio } from '@/theme';

const aleatorio = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/** Fotos de antes e depois do serviço, guardadas junto do orçamento. */
export function FotosServico({ orcamentoId }: { orcamentoId: string }) {
  const { sessao } = useAuth();
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [aberta, setAberta] = useState<Foto | null>(null);

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('orcamento_fotos').select('*').eq('orcamento_id', orcamentoId).order('criado_em');
    setFotos((data as Foto[]) ?? []);
  }, [orcamentoId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function adicionar(momento: Foto['momento'], origem: 'camera' | 'galeria') {
    const perm = origem === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão negada', 'Libere o acesso nas configurações do celular para adicionar fotos.');
      return;
    }
    const opcoes: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: false };
    const r = origem === 'camera' ? await ImagePicker.launchCameraAsync(opcoes) : await ImagePicker.launchImageLibraryAsync(opcoes);
    if (r.canceled || !r.assets[0] || !sessao) return;

    setEnviando(true);
    const caminho = `${sessao.user.id}/${orcamentoId}/${aleatorio()}.jpg`;
    try {
      const img = await reduzirImagem(r.assets[0].uri, 1400, r.assets[0].width);
      const up = await supabase.storage.from('fotos').upload(caminho, decode(img.base64), { contentType: img.mime });
      if (up.error) throw up.error;
    } catch {
      setEnviando(false);
      Alert.alert('Ops', 'Não foi possível enviar a foto. Verifique a internet e tente de novo.');
      return;
    }
    const url = supabase.storage.from('fotos').getPublicUrl(caminho).data.publicUrl;
    await supabase.from('orcamento_fotos').insert({ orcamento_id: orcamentoId, caminho, url, momento });
    setEnviando(false);
    carregar();
  }

  function escolher(momento: Foto['momento']) {
    Alert.alert(momento === 'antes' ? 'Foto de antes' : 'Foto de depois', undefined, [
      { text: 'Tirar foto', onPress: () => adicionar(momento, 'camera') },
      { text: 'Escolher da galeria', onPress: () => adicionar(momento, 'galeria') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function apagar(f: Foto) {
    setAberta(null);
    await supabase.storage.from('fotos').remove([f.caminho]);
    await supabase.from('orcamento_fotos').delete().eq('id', f.id);
    carregar();
  }

  const grupo = (momento: Foto['momento']) => {
    const lista = fotos.filter((f) => f.momento === momento);
    return (
      <View style={{ gap: espaco.s }}>
        <Text style={[fonte.rotulo, { color: cores.tinta }]}>{momento === 'antes' ? 'Antes' : 'Depois'}</Text>
        <View style={s.grade}>
          {lista.map((f) => (
            <Pressable key={f.id} onPress={() => setAberta(f)} accessibilityLabel="Ver foto">
              <Image source={{ uri: f.url }} style={s.mini} />
            </Pressable>
          ))}
          <Pressable onPress={() => escolher(momento)} style={[s.mini, s.add]} accessibilityLabel={`Adicionar foto de ${momento}`} disabled={enviando}>
            {enviando ? <ActivityIndicator color={cores.primaria} /> : <Ionicons name="camera" size={24} color={cores.primariaEscura} />}
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={{ backgroundColor: cores.superficie, borderRadius: raio.m, padding: espaco.m, gap: espaco.m }}>
      {grupo('antes')}
      {grupo('depois')}
      <Text style={fonte.pequeno}>As fotos aparecem para o cliente no link e passam mais confiança.</Text>

      <Modal visible={!!aberta} transparent animationType="fade" onRequestClose={() => setAberta(null)}>
        <View style={s.fundo}>
          {aberta ? <Image source={{ uri: aberta.url }} style={{ width: '100%', height: '70%' }} resizeMode="contain" /> : null}
          <View style={{ flexDirection: 'row', gap: espaco.l, marginTop: espaco.l }}>
            <Pressable onPress={() => aberta && apagar(aberta)} style={s.acao}>
              <Ionicons name="trash-outline" size={22} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700' }}>Apagar</Text>
            </Pressable>
            <Pressable onPress={() => setAberta(null)} style={s.acao}>
              <Ionicons name="close" size={22} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700' }}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.s },
  mini: { width: 76, height: 76, borderRadius: 12, backgroundColor: cores.fundo },
  add: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: cores.primaria },
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: espaco.l },
  acao: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: espaco.m },
});
