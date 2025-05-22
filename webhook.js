const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');

const app = express();
app.use(bodyParser.json());

app.post('/webhook', (req, res) => {
  console.log('🔁 Webhook recebido');
  exec('cd ~/backend && git pull origin main && pm2 restart apae-api', (err, stdout, stderr) => {
    if (err) {
      console.error(`Erro ao atualizar: ${err.message}`);
      return res.status(500).send('Erro ao atualizar');
    }
    console.log(`Atualização: ${stdout}`);
    res.status(200).send('Atualizado com sucesso');
  });
});

app.listen(4000, () => {
  console.log('🚀 Webhook escutando na porta 4000');
});
