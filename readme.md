Backend - Projeto APAE

API desenvolvida com Node.js + Express para gerenciamento de eventos e ingressos da APAE, com autenticação via Firebase e banco de dados Firestore.

---

Como rodar o projeto localmente

### 1. Clone o repositório

git clone https://github.com/RTeixe0/apae-backend.git
cd apae-backend


2. Instale as dependências

npm install
As configurações sensíveis (como chave do Firebase) já estão na VM oficial de produção. Para uso local, é necessário configurar manualmente ou focar no desenvolvimento das rotas e testes offline.


Porta padrão: 3000

Banco de dados: Firestore

Autenticação: Firebase Authentication

Armazenamento: Cloud Storage (QRs e banners)



Como colaborar
Crie uma nova branch:

git checkout -b nome-da-sua-branch


Faça as alterações necessárias.

Suba sua branch:

git push origin nome-da-sua-branch

Abra um Pull Request para a branch main.

Após o merge, a VM da Google Cloud irá automaticamente rodar git pull e atualizar a API.



Testando a API
Use ferramentas como:

curl

Postman

Para testar rotas protegidas, gere um token válido do Firebase e envie no header:



EXEMPLO COM ROTA EVENTS:
curl -H "Authorization: Bearer SEU_TOKEN" http://localhost:3000/events


📦 Dependências principais
express

firebase-admin

nodemailer

qrcode

cors

body-parser
