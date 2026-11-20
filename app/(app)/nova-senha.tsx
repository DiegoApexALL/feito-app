import { useState } from 'react';
import { Aviso, Botao, Cabecalho, Campo, ForcaDaSenha, Tela } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { senhaAceita, traduzErroAuth } from '@/lib/validacao';

export default function NovaSenha() {
  const { setPrecisaNovaSenha, sair } = useAuth();
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function salvar() {
    setErro(null);
    if (!senhaAceita(senha)) return setErro('Use 8+ caracteres com letras e números.');
    if (senha !== confirmar) return setErro('As senhas não são iguais.');
    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setCarregando(false);
    if (error) return setErro(traduzErroAuth(error.message));
    setPrecisaNovaSenha(false);
  }

  return (
    <Tela
      rodape={
        <>
          <Botao titulo="Salvar nova senha" onPress={salvar} carregando={carregando} />
          <Botao titulo="Cancelar" variante="texto" onPress={sair} />
        </>
      }
    >
      <Cabecalho titulo="Crie uma nova senha" subtitulo="Escolha uma senha forte que você não usa em outro lugar." />
      {erro ? <Aviso texto={erro} /> : null}
      <Campo rotulo="Nova senha" value={senha} onChangeText={setSenha} senha autoComplete="new-password" textContentType="newPassword" />
      <ForcaDaSenha senha={senha} />
      <Campo rotulo="Confirme a senha" value={confirmar} onChangeText={setConfirmar} senha autoComplete="new-password" textContentType="newPassword" />
    </Tela>
  );
}
