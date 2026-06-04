# Firebase Auth e Firestore - Passo a Passo

## Status atual

- [x] Firebase Authentication criado.
- [x] Provider Google ativado.
- [x] Provider Email/Password ativado.
- [x] Firestore Database criado fora do modo test.
- [x] Dominios autorizados configurados ate o passo 2.
- [x] Variaveis `VITE_FIREBASE_*` adicionadas ao projeto local.
- [x] Login com Google conectado no codigo.
- [x] Cadastro e login com email/senha conectados no codigo.

## 1. Conferir variaveis de ambiente

No projeto local existe `.env.local` com:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

Na Vercel, adicionar as mesmas variaveis em:

Project Settings -> Environment Variables

Depois de salvar, fazer redeploy.

## 2. Conferir dominios autorizados

No Firebase Console:

Authentication -> Settings -> Authorized domains

Adicionar:

- `localhost`
- dominio principal da Vercel
- qualquer dominio customizado que for usado depois

Exemplos:

```txt
localhost
landing-page.vercel.app
www.seudominio.com
```

## 3. Testar Authentication

### Google

1. Abrir `/login`.
2. Clicar em `Login with Google`.
3. Escolher uma conta.
4. Confirmar se redireciona para `/profile` ou `/admin`.

### Email e senha

1. Abrir `/signup`.
2. Preencher nome, email e senha.
3. A senha precisa ter no minimo 6 caracteres.
4. Criar a conta.
5. Confirmar se redireciona para `/profile`.
6. Sair ou abrir `/login`.
7. Entrar com o mesmo email e senha.

## 4. Como o admin funciona agora

Hoje o codigo considera admin pelo email:

```txt
gutiajs@gmail.com
```

Esse controle serve para UI, mas ainda nao e seguranca real no Firestore.

Para Firestore seguro, depois precisamos criar uma forma de role real:

- opcao simples: documento `users/{uid}` com `role: "admin"`
- opcao mais forte: Firebase Custom Claims via backend/admin SDK

## 5. Proximo passo: persistencia real da sessao

Hoje o app ainda salva um perfil simples no `localStorage` depois do login.

O proximo ajuste ideal e usar:

```ts
onAuthStateChanged(auth, callback)
```

Objetivo:

- manter usuario logado depois de atualizar a pagina;
- carregar usuario direto do Firebase;
- limpar sessao corretamente no logout;
- evitar depender apenas do `localStorage`.

## 6. Proximo passo: Firestore para usuarios

Criar colecao:

```txt
users
```

Documento:

```txt
users/{uid}
```

Campos sugeridos:

```json
{
  "uid": "firebase-user-id",
  "name": "Client Name",
  "email": "client@email.com",
  "role": "client",
  "company": "Company Name",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Quando o usuario cadastrar com Google ou email/senha:

1. autenticar no Firebase Auth;
2. criar ou atualizar `users/{uid}`;
3. carregar esse perfil no app.

## 7. Proximo passo: Firestore para feedbacks

Criar colecao:

```txt
feedbacks
```

Documento:

```json
{
  "userId": "firebase-user-id",
  "quote": "Texto do feedback",
  "project": "Nome do projeto",
  "result": "Resultado alcançado",
  "mediaUrl": "https://...",
  "mediaType": "image",
  "rating": 5,
  "approved": false,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Fluxo:

1. cliente envia feedback;
2. feedback entra com `approved: false`;
3. admin aprova no painel;
4. landing page publica apenas feedbacks com `approved: true`.

## 8. Rules iniciais do Firestore

Quando formos ligar Firestore no codigo, usar regras com esta ideia:

```txt
users:
- usuario logado pode ler e editar o proprio perfil;
- admin pode ler usuarios.

feedbacks:
- publico pode ler apenas approved == true;
- usuario logado pode criar feedback proprio;
- usuario logado pode ler feedback proprio;
- admin pode aprovar, rejeitar e deletar.
```

Nao deixar regra aberta tipo:

```txt
allow read, write: if true;
```

## 9. Checklist antes de deploy

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Testar `/login` com Google.
- [ ] Testar `/signup` com email/senha.
- [ ] Testar `/login` com email/senha.
- [ ] Verificar se o dominio da Vercel esta autorizado no Firebase.
- [ ] Verificar se todas as envs existem na Vercel.
- [ ] Fazer redeploy depois de adicionar envs.

## 10. Erros comuns

### `auth/unauthorized-domain`

O dominio atual nao esta em Authorized domains no Firebase.

### `auth/invalid-credential`

Email ou senha incorretos, ou usuario nao existe nesse provider.

### `auth/email-already-in-use`

Ja existe uma conta com esse email.

### `Firebase authentication is not configured`

Alguma variavel `VITE_FIREBASE_*` esta faltando no ambiente local ou na Vercel.

