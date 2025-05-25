require('dotenv').config();

// 🔐 Script para fazer login com email e senha e obter o token JWT do usuário

const { initializeApp } = require('firebase/app');
const {
  getAuth,
  signInWithEmailAndPassword
} = require('firebase/auth');

// 🔐 SUBSTITUA com os dados do seu projeto
const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: 'apae-eventos.firebaseapp.com',
};

const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

signInWithEmailAndPassword(auth, email, password)
  .then(async (userCredential) => {
    const token = await userCredential.user.getIdToken(true);
    console.log('\n🔥 Token JWT:\n');
    console.log(token);
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Erro no login:', err.message);
    process.exit(1);
  });
