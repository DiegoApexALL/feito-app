# Feito! ✓

App para prestadores de serviço (eletricista, pedreiro, encanador…) criarem orçamentos bonitos e enviarem pelo WhatsApp ou PDF, com tudo guardado e o cliente aprovando pelo link.

**Stack:** Expo (React Native + expo-router, também roda na web) · Supabase (Auth, Postgres, Storage)

## O que já está pronto
**Acesso e cadastro**
- Boas-vindas, criar conta (medidor de força da senha), entrar, recuperar senha com código de 6 dígitos
- Cadastro do prestador em 2 passos: negócio (logo, CPF/CNPJ validado, especialidades, CEP com busca automática) e Pix

**Trabalho do dia a dia**
- **Início:** resumo do mês (orçamentos, aprovados, valor fechado), últimos orçamentos, contador do plano grátis
- **Clientes:** lista com busca, cadastro, histórico de orçamentos por cliente e atalho para o WhatsApp
- **Novo orçamento:** o prestador fala (microfone do teclado) ou digita do jeito dele, e o botão *Montar itens* separa serviços e materiais, com quantidade, unidade e valor. Ex.: *"troquei 3 tomadas a 50 cada, 10 metros de fio por 45 e mão de obra 200"*. Também tem itens editáveis, desconto, validade, prazo, forma de pagamento e observações
- **Orçamento pronto:** enviar pelo WhatsApp (mensagem pronta com o link), PDF profissional em A4 com logo, QR Code Pix e campo de assinatura, compartilhar link, duplicar, editar e excluir
- **Acompanhamento:** criado → enviado → cliente abriu o link → aprovado/recusado → concluído → pago

**Novidades da versão 0.2**
- **Fotos de antes e depois** no orçamento (câmera ou galeria). Elas aparecem no PDF e no link do cliente
- **Meus preços:** cada item com valor vira um preço salvo, para usar de novo com um toque
- **Chamar de volta:** lembrete de revisão ou manutenção em 3, 6 ou 12 meses, que aparece no Início com o botão do WhatsApp
- **Receber agora:** QR Code Pix em tela cheia para o cliente pagar na hora
- Ícone do app

**Página do cliente (`/o/<código>`)**
- Abre no navegador, sem login nem instalação
- Mostra o orçamento, um QR Code Pix com o valor já preenchido, o Pix Copia e Cola, os botões aprovar/recusar (com nome e motivo) e o contato do prestador no WhatsApp

**Planos (monetização)**
- Grátis: 5 orçamentos por mês, com o rodapé "Feito com o app Feito!" (cada orçamento enviado divulga o app)
- Pro (R$ 19,90/mês): ilimitado e sem a marca. O limite é aplicado pelo próprio banco, então não dá para burlar pelo app

## Instalar no Android (APK)
A cada envio para o `main`, o GitHub Actions monta o APK e publica em **Releases**:
https://github.com/DiegoApexALL/feito-app/releases. Abra pelo celular, baixe o `.apk` e toque para instalar. Na primeira vez, permita "instalar apps desconhecidos".
Se o build falhar, o log do erro aparece numa release marcada como "Erro no build".

## Como rodar
```bash
npm install
npx expo install --fix      # alinha as versões com o SDK do Expo instalado
cp .env.example .env
npx expo start              # abra no celular com o app Expo Go
npm test                    # testes da montagem de itens e do Pix
```

### Publicar a página do cliente
A página `/o/<código>` é a versão web do próprio app:
```bash
npx expo export -p web
npx eas-cli deploy          # EAS Hosting (grátis para começar)
```
Coloque o endereço publicado em `EXPO_PUBLIC_SITE_URL` no `.env`.

### Ativar o pagamento do Pro
1. Crie um link de pagamento recorrente (Mercado Pago Assinaturas ou Stripe Payment Link) e coloque em `EXPO_PUBLIC_CHECKOUT_PRO_URL`.
2. O app abre o link com `client_reference_id=<id do prestador>`.
3. No webhook do pagamento aprovado, chame com a chave **service_role** (nunca no app):
   `select public.ativar_plano_pro('<id do prestador>', 31);`

## Segurança
- Senhas pelo Supabase Auth (bcrypt). O app exige 8+ caracteres com letras e números
- Sessão no cofre do aparelho (Keychain/Keystore via `expo-secure-store`)
- Row Level Security em todas as tabelas: cada prestador só vê os próprios clientes e orçamentos
- Campos sensíveis protegidos no banco: o prestador não muda o próprio plano, não altera totais na mão (são recalculados pelos itens) e não marca "aprovado pelo cliente"
- O link do cliente usa um código aleatório (UUID) impossível de adivinhar. Rascunhos não aparecem pelo link
- Logos: cada usuário só grava na própria pasta, até 2 MB, só imagens

### Ajustes no painel do Supabase (1 vez)
Em **Authentication**, no projeto `feito-app`:
1. **Providers › Email**: "Confirm email" ligado, **Minimum password length = 8**, exigir letras e números.
2. **Attack Protection**: ligar **Leaked password protection** (plano Pro do Supabase).
3. **Emails › Reset Password**: incluir o código no texto: `Seu código do Feito!: {{ .Token }}`.
4. **Emails › SMTP**: para produção, usar um SMTP próprio (ex.: Resend).
5. **URL Configuration**: colocar o endereço do site em *Site URL*.

## Banco de dados
Projeto Supabase `feito-app` (`jlcisnsdbrynxozrfqey`, São Paulo). As migrações aplicadas ficam em `supabase/migrations/`.

| Tabela / função | Para quê |
|---|---|
| `prestadores` | Perfil e plano (criado automaticamente no cadastro) |
| `dados_pagamento` | Chave Pix |
| `clientes` | Carteira de clientes |
| `orcamentos` | Orçamento, status, numeração automática, código do link |
| `orcamento_itens` | Serviços e materiais (o total é recalculado sozinho) |
| `orcamento_publico(token)` | O que o cliente vê pelo link |
| `responder_orcamento(...)` | Aprovar/recusar pelo link |
| `resumo_mes()` | Números da tela inicial |
| `ativar_plano_pro(id, dias)` | Libera o Pro (só o backend de pagamento) |

## Próximas ideias
- Fotos de antes e depois no orçamento
- Lembrete automático de retorno ("faz 6 meses da limpeza do ar")
- Voz com IA de verdade (transcrição + entendimento) para frases mais livres
- Catálogo de serviços e materiais com preços salvos
- Parceria com lojas de material de construção
