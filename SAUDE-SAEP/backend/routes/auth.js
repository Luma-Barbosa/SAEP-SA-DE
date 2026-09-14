const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({
      erro: 'campo_obrigatorio',
      mensagem: 'email ou senha obrigatório',
    });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, nome, email, senha, foto FROM usuarios WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        erro: 'credenciais_invalidas',
        mensagem: 'email ou senha incorreta',
      });
    }

    const usuario = rows[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({
        erro: 'credenciais_invalidas',
        mensagem: 'email ou senha incorreta',
      });
    }

    return res.json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      foto: usuario.foto,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'erro_servidor', mensagem: 'Erro ao processar login' });
  }
});

module.exports = router;