const { admin } = require('../config/firebase');

const uid = 'T5D00rpnY8SJNZ91AlhAxyezuDq1';
const role = 'admin';

admin.auth().setCustomUserClaims(uid, { role })
  .then(() => {
    console.log(`Papel "${role}" atribuído ao usuário ${uid}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erro ao definir papel:', error);
    process.exit(1);
  });
