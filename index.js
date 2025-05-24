const cors = require('cors');
const express = require('express');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('API APAE Online'));

const testRoutes = require('./routes/test');
app.use('/test', testRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

