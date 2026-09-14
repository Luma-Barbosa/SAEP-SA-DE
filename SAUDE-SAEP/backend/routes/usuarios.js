const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');

const router = express.Router();

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT id, nome, foto FROM usuarios WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ erro: 'usuario_nao_encontrado' });
    }

    const [totais] = await pool.query(
      `SELECT COUNT(*) AS qtd_atividades, COALESCE(SUM(calorias),0) AS qtd_calorias
       FROM atividades WHERE usuario_id = ?`,
      [id]
    );

    return res.json({
      ...rows[0],
      qtd_atividades: totais[0].qtd_atividades,
      qtd_calorias: totais[0].qtd_calorias,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'erro_servidor' });
  }
});

router.post('/', async (req, res) => {
  const { nome, email, senha, foto } = req.body;
  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'campo_obrigatorio', mensagem: 'nome, email e senha são obrigatórios' });
  }
  try {
    const hash = await bcrypt.hash(senha, 10);
    const [result] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha, foto) VALUES (?, ?, ?, ?)',
      [nome, email, hash, foto || 'default-user.png']
    );
    return res.status(201).json({ id: result.insertId, nome, email });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ erro: 'email_ja_cadastrado' });
    }
    console.error(err);
    return res.status(500).json({ erro: 'erro_servidor' });
  }
});

module.exports = router;