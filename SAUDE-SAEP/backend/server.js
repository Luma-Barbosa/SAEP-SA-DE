require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const empresaRoutes = require('./routes/empresa');
const usuariosRoutes = require('./routes/usuarios');
const atividadesRoutes = require('./routes/atividades');

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api/auth', authRoutes);
app.use('/api/empresa', empresaRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/atividades', atividadesRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor SAEPSaude rodando em http://localhost:${PORT}`);
});