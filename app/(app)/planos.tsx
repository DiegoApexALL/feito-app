import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { Botao, Cabecalho, Campo, Tela } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { planoAtivo, supabase } from '@/lib/supabase';
import { cores, espaco, fonte, raio } from '@/theme';

const PRECO_PRO = 'R$ 19,90';

const GRATIS = ['5 orçamentos por mês', 'PDF e envio pelo WhatsApp', 'Link de aprovação para o cliente', 'Pix com QR Code', 'Rodapé "Feito com o app Feito!"'];
const PRO = ['Orçamentos ilimitados', 'Sem a marca do Feito!', 'Sua logo em destaque', 'Tudo do plano grátis', 'Suporte prioritário pelo WhatsApp'];

function Lista({ itens, cor }: { itens: string[]; cor: string }) {
  return (
    <View style={{ gap: 10 }}>
      {itens.map((t) => (
        <View key={t} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Ionicons name="checkmark-circle" size={20} color={cor} />
          <Text style={[fonte.corpo, { flex: 1, color: cor === '#fff' ? '#fff' : cores.texto }]}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

export default function Planos() {
  const { prestador, sessao, recarregarPerfil } = useAuth();
  const pro = planoAtivo(prestador);

  const [email, setEmail] = useState(sessao?.user.email ?? '');
  const [abrindo, setAbrindo] = useState(false);
  const [aguardando, setAguardando] = useState(false);

  async function assinar() {
    setAbrindo(true);
    const { data, error } = await supabase.functions.invoke('assinar-pro', { body: { email: email.trim() } });
    setAbrindo(false);
    if (error || !data?.url) {
      let codigo = '';
      try {
        codigo = (await (error as any)?.context?.json())?.erro ?? '';
      } catch {}
      Alert.alert(
        codigo === 'pagamento_nao_configurado' ? 'Em breve' : 'Ops',
        codigo === 'pagamento_nao_configurado'
          ? 'O pagamento do Pro está sendo configurado. Avisaremos você pelo WhatsApp!'
          : 'Não foi possível abrir o pagamento. Confira o e-mail da sua conta Mercado Pago e tente de novo.',
      );
      return;
    }
    setAguardando(true);
    await Linking.openURL(data.url);
  }

  return (
    <Tela
      rodape={
        pro ? (
          <Botao titulo="Atualizar status" variante="secundario" onPress={recarregarPerfil} />
        ) : (
          <>
            <Botao titulo={`Assinar o Pro · ${PRECO_PRO}/mês`} onPress={assinar} carregando={abrindo} />
            {aguardando ? <Botao titulo="Já paguei, atualizar" variante="texto" onPress={recarregarPerfil} /> : null}
          </>
        )
      }
    >
      <Cabecalho titulo="Seu orçamento com cara de empresa" subtitulo="Comece grátis. Quando o trabalho apertar, vire Pro." />

      <View style={[s.plano, pro && { opacity: 0.6 }]}>
        <Text style={s.nome}>Grátis</Text>
        <Text style={s.preco}>R$ 0</Text>
        <Lista itens={GRATIS} cor={cores.textoSuave} />
      </View>

      <View style={[s.plano, s.pro]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[s.nome, { color: '#FDBA74', flex: 1 }]}>Pro</Text>
          {pro ? <Text style={s.selo}>SEU PLANO</Text> : <Text style={s.selo}>MAIS ESCOLHIDO</Text>}
        </View>
        <Text style={[s.preco, { color: '#fff' }]}>
          {PRECO_PRO}
          <Text style={{ fontSize: 16, fontWeight: '600' }}> /mês</Text>
        </Text>
        <Lista itens={PRO} cor="#fff" />
      </View>

      {!pro ? (
        <Campo
          rotulo="E-mail da sua conta Mercado Pago"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          dica="Pagamento seguro pelo Mercado Pago, com cartão. Libera na hora."
        />
      ) : null}
      <Text style={[fonte.pequeno, { textAlign: 'center' }]}>Cancele quando quiser. Um único serviço fechado já paga o mês.</Text>
    </Tela>
  );
}

const s = StyleSheet.create({
  plano: { backgroundColor: cores.superficie, borderRadius: raio.g, padding: espaco.l, gap: espaco.s, marginBottom: espaco.m },
  pro: { backgroundColor: cores.tinta },
  nome: { fontSize: 15, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, color: cores.textoSuave },
  preco: { fontSize: 32, fontWeight: '900', color: cores.tinta, marginBottom: espaco.s },
  selo: { fontSize: 11, fontWeight: '800', color: cores.tinta, backgroundColor: '#FDBA74', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
});
