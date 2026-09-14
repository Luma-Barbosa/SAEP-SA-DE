const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [empresaRows] = await pool.query('SELECT * FROM empresa LIMIT 1');
    const empresa = empresaRows[0] || {};

    // Totais gerais persistidos no banco (regra 2.2.1 e 2.3.1)
    const [totais] = await pool.query(`
      SELECT
        COUNT(*) AS qtd_atividades,
        COALESCE(SUM(calorias), 0) AS qtd_calorias
      FROM atividades
    `);

    return res.json({
      nome: empresa.nome,
      logo: empresa.logo,
      instagram: empresa.instagram,
      twitter: empresa.twitter,
      tiktok: empresa.tiktok,
      copyright_ano: empresa.copyright_ano,
      qtd_atividades: totais[0].qtd_atividades,
      qtd_calorias: totais[0].qtd_calorias,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'erro_servidor' });
  }
});

module.exports = router;