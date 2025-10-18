# 📦 Backend - Projeto APAE

API desenvolvida em **Node.js + Express** para gestão de **eventos e ingressos com QR Code**, implantada em infraestrutura **AWS IaaS**.  
Utiliza **MySQL (em EC2 privada)**, **Cognito** para autenticação e **S3** para armazenamento dos QR Codes.

---

## ☁️ Arquitetura AWS

- **EC2 Pública (`apae-api`)** → Hospeda a API Node.js (porta `3000`)
- **EC2 Privada (`apae-db`)** → Banco de dados MySQL (porta `3306`)
- **S3 Bucket (`apae-qrcodes`)** → Armazena imagens de QR Codes geradas pela API
- **IAM Role (`apae-s3-role`)** → Permite upload no S3 sem uso de chaves locais
- **VPC (`10.0.0.0/16`)** com **sub-redes pública e privada**, conectadas via **NAT Gateway**

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
   Crie um arquivo `.env` com as variáveis:

```env
DB_HOST=localhost
DB_USER=root
DB_PASS=sua_senha
DB_NAME=apae

AWS_REGION=sa-east-1
S3_BUCKET=apae-qrcodes

COGNITO_CLIENT_ID=
COGNITO_USER_POOL_ID=sa-east-1_XXXXXXX
```

> 🔐 No ambiente AWS, as credenciais S3 são obtidas automaticamente via **IAM Role** vinculada à instância EC2.

4. **Inicie o servidor**

```bash
node index.js
```

> Porta padrão: `3000`

---

## 📁 Tecnologias usadas

- **Node.js + Express** — Estrutura da API
- **MySQL** — Banco relacional (armazenamento de eventos, ingressos e logs)
- **AWS S3 SDK** — Upload dos QR Codes
- **AWS Cognito** — Autenticação e controle de acesso
- **QRCode / qrcode** — Geração dos ingressos em imagem
- **dotenv, cors, body-parser** — Utilitários de configuração e middleware
- **PM2** — Gerenciador de processos na EC2

---

## 🧪 Como testar a API

Use o **Postman** ou **curl** para chamar os endpoints.

1. Obtenha o **Bearer Token** via AWS CLI:

```bash
aws cognito-idp initiate-auth   --auth-flow USER_PASSWORD_AUTH   --client-id 3co9dgki4oik0ptb8armn1m0cv   --auth-parameters USERNAME="seuemail@teste.com",PASSWORD="Senha#123"
```

2. Teste uma rota autenticada:

```bash
curl -H "Authorization: Bearer $TOKEN" http://56.125.51.209:3000/tickets
```

---

## ☁️ Deploy

A API está hospedada na **instância EC2 pública (apae-api)**.  
Gerenciamento de processo feito via **PM2**, com logs locais e acesso SSH restrito ao administrador.  
O **banco MySQL** roda em uma **instância EC2 privada**, acessível apenas internamente via VPC.

---

## 🔐 Segurança Implementada

- Comunicação entre EC2s apenas via **VPC (porta 3306 interna)**
- Acesso SSH restrito por IP fixo
- Credenciais seguras via **IAM Role** e **Cognito**
- Nenhuma chave sensível exposta no código
- Bucket S3 configurado com **ACL privada**

---

## 👨‍💻 Colaboração

1. Crie uma nova branch:

```bash
git checkout -b feature/nome
```

2. Faça alterações e commit:

```bash
git commit -m "feat: nova funcionalidade"
```

3. Envie ao repositório remoto:

```bash
git push origin feature/nome
```

4. Abra um **Pull Request** para `main`.

---

## 📌 Observações

- Os QR Codes são armazenados automaticamente no **S3**.
- As verificações de uso de ingresso são gravadas na tabela `logs`.
- O ambiente segue boas práticas de segurança e separação de camadas (API pública, banco privado).
