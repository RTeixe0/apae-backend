# 📦 Backend - Projeto APAE

API desenvolvida em **Node.js + Express** para gerenciamento de eventos e ingressos da APAE, com autenticação via **Firebase** e banco de dados **Firestore**.

---

## 🚀 Como rodar o projeto localmente

1. **Clone o repositório**
```bash
git clone https://github.com/RTeixe0/apae-backend.git
cd apae-backend
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o ambiente**
Crie um arquivo `.env` com as seguintes variáveis:

```env
FIREBASE_PROJECT_ID=apae-eventos
FIREBASE_CLIENT_EMAIL=exemplo@apae-eventos.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSUA_CHAVE\n-----END PRIVATE KEY-----\n"

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seuemail@gmail.com
SMTP_PASS=sua_senha_de_app
```

> 🔐 As credenciais do Firebase podem ser obtidas no Firebase Console → Configurações do Projeto → Contas de Serviço → Gerar nova chave privada

4. **Inicie o servidor**
```bash
node index.js
```

> Porta padrão: `3000`

---

## 📁 Tecnologias usadas

- Node.js
- Express
- Firebase Admin SDK (Firestore + Auth + Storage)
- Nodemailer (envio de e-mail)
- QRCode (geração de QR Code)
- dotenv, cors, body-parser

---

## 🧪 Como testar a API

Use ferramentas como **Postman** ou **curl**.

- Para rotas protegidas, gere um token JWT válido no Firebase e envie no header:

```bash
curl -H "Authorization: Bearer SEU_TOKEN" http://localhost:3000/events
```

---

## 👨‍💻 Como colaborar

1. Crie uma nova branch:
```bash
git checkout -b nome-da-sua-branch
```

2. Faça suas alterações e commit:
```bash
git add .
git commit -m "feat: descrição da funcionalidade"
```

3. Suba a branch para o repositório remoto:
```bash
git push -u origin nome-da-sua-branch
```

4. Abra um **Pull Request** para a branch `main`.

---

## ☁️ Deploy

Após o merge na `main`, a **VM na Google Cloud** executa automaticamente `git pull` e atualiza a API de produção.

---

## 📌 Observações

- Os QR Codes são armazenados diretamente no **Firebase Storage**
- Todos os dados sensíveis devem ser configurados localmente via `.env`
- A branch `main` está conectada à instância oficial da API

---
