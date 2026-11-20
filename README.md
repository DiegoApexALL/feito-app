# Feito! ✓

App para prestadores de serviço (eletricista, pedreiro, encanador…) criarem orçamentos bonitos e enviarem pelo WhatsApp ou PDF, com tudo guardado.

**Stack:** Expo (React Native + expo-router) · Supabase (Auth, Postgres, Storage)

## Parte 1 — pronta
- Boas-vindas, criar conta, entrar, recuperar senha (código de 6 dígitos por e-mail)
- Cadastro do prestador em 2 passos: negócio (logo, CPF/CNPJ validado, especialidades, CEP com busca automática) e recebimento via Pix
- Tela inicial com atalhos

## Como rodar
```bash
npm install
npx expo install --fix      # alinha as versões com o SDK do Expo instalado
cp .env.example .env
npx expo start              # abra no celular com o app Expo Go
```

## Segurança
- Senhas: guardadas pelo Supabase Auth (bcrypt). O app exige 8+ caracteres com letras e números e mostra a força da senha.
- Sessão salva no cofre do aparelho (Keychain/Keystore via `expo-secure-store`), nunca em texto aberto.
- Row Level Security em todas as tabelas: cada prestador só lê e altera os próprios dados.
- Logos no bucket `logos`, cada usuário só grava na própria pasta (`logos/<id>/`), máx. 2 MB, só imagens.
- Funções do banco com `search_path` fixo; o Security Advisor do Supabase não aponta nenhum problema.

### Ajustes no painel do Supabase (1 vez, uns 2 minutos)
Em **Authentication**, no projeto `feito-app`:
1. **Sign In / Providers › Email**: deixe "Confirm email" ligado e **Minimum password length = 8**, com "Lowercase, uppercase letters and digits".
2. **Attack Protection**: ligue **Leaked password protection** (bloqueia senhas que já vazaram). Disponível no plano Pro.
3. **Emails › Reset Password**: troque o texto do e-mail para incluir o código: `Seu código do Feito!: {{ .Token }}`.
4. **Emails › SMTP**: para produção, configure um SMTP próprio (Resend, por exemplo). O SMTP padrão manda poucos e-mails por hora.

## Banco de dados
Projeto Supabase `feito-app` (`jlcisnsdbrynxozrfqey`, São Paulo). As migrações aplicadas ficam em `supabase/migrations/`.

| Tabela | O que guarda |
|---|---|
| `prestadores` | Perfil 1:1 com o usuário (criado automaticamente no cadastro) |
| `dados_pagamento` | Chave Pix, titular e banco |

## Próximas partes
2. Clientes · 3. Orçamento (itens, materiais, fotos, voz com IA) · 4. PDF + envio por WhatsApp + link de aprovação · 5. Planos e assinatura
