const express = require('express');
const pool = require('../db');

const router = express.Router();

const LIMITE_PAGINA = 4; 

function formatarAtividade(row, usuarioLogadoId) {
  return {
    id: row.id,
    tipo: row.tipo,
    usuario_id: row.usuario_id,
    usuario_nome: row.usuario_nome,
    usuario_foto: row.usuario_foto,
    distancia_km: Number((row.distancia_metros / 1000).toFixed(2)), 
    duracao_horas: Number((row.duracao_minutos / 60).toFixed(2)),  
    duracao_minutos: row.duracao_minutos,
    calorias: row.calorias,
    criado_em: row.criado_em,
    qtd_likes: Number(row.qtd_likes) || 0,
    qtd_comentarios: Number(row.qtd_comentarios) || 0,
    curtido_por_mim: usuarioLogadoId ? !!row.curtido_por_mim : false,
  };
}

router.get('/', async (req, res) => {
  const { tipo, page = 1, usuario_id, usuarioLogadoId } = req.query;
  const pagina = Math.max(parseInt(page, 10) || 1, 1);
  const offset = (pagina - 1) * LIMITE_PAGINA;

  const condicoes = [];
  const params = [];

  if (tipo && ['corrida', 'caminhada', 'trilha'].includes(tipo)) {
    condicoes.push('a.tipo = ?');
    params.push(tipo);
  }
  if (usuario_id) {
    condicoes.push('a.usuario_id = ?');
    params.push(usuario_id);
  }
  const whereSql = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

  try {
    const [totalRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM atividades a ${whereSql}`,
      params
    );
    const total = totalRows[0].total;
    const totalPaginas = Math.max(Math.ceil(total / LIMITE_PAGINA), 1);

    const curtidoSelect = usuarioLogadoId
      ? `EXISTS(SELECT 1 FROM likes l2 WHERE l2.atividade_id = a.id AND l2.usuario_id = ${pool.escape(usuarioLogadoId)}) AS curtido_por_mim`
      : '0 AS curtido_por_mim';

    const [rows] = await pool.query(
      `SELECT
          a.id, a.tipo, a.usuario_id, a.distancia_metros, a.duracao_minutos,
          a.calorias, a.criado_em,
          u.nome AS usuario_nome, u.foto AS usuario_foto,
          (SELECT COUNT(*) FROM likes l WHERE l.atividade_id = a.id) AS qtd_likes,
          (SELECT COUNT(*) FROM comentarios c WHERE c.atividade_id = a.id) AS qtd_comentarios,
          ${curtidoSelect}
       FROM atividades a
       JOIN usuarios u ON u.id = a.usuario_id
       ${whereSql}
       ORDER BY a.criado_em DESC
       LIMIT ? OFFSET ?`,
      [...params, LIMITE_PAGINA, offset]
    );

    return res.json({
      pagina,
      totalPaginas,
      total,
      limite: LIMITE_PAGINA,
      atividades: rows.map((r) => formatarAtividade(r, usuarioLogadoId)),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'erro_servidor' });
  }
});

router.get('/:id/comentarios', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.texto, c.criado_em, u.nome AS usuario_nome, u.foto AS usuario_foto
       FROM comentarios c
       JOIN usuarios u ON u.id = c.usuario_id
       WHERE c.atividade_id = ?
       ORDER BY c.criado_em ASC`,
      [id]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'erro_servidor' });
  }
});

router.post('/', async (req, res) => {
  const { usuario_id, tipo, distancia_metros, duracao_minutos, calorias } = req.body;

  const camposFaltando = [];
  if (!usuario_id) camposFaltando.push('usuario_id');
  if (!tipo) camposFaltando.push('tipo');
  if (distancia_metros === undefined || distancia_metros === null || distancia_metros === '') camposFaltando.push('distancia_metros');
  if (duracao_minutos === undefined || duracao_minutos === null || duracao_minutos === '') camposFaltando.push('duracao_minutos');
  if (calorias === undefined || calorias === null || calorias === '') camposFaltando.push('calorias');

  // Regra 5.1: campo ausente -> "Campo obrigatório"
  if (camposFaltando.length > 0) {
    return res.status(400).json({
      erro: 'campo_obrigatorio',
      mensagem: 'Campo obrigatório',
      campos: camposFaltando,
    });
  }

  if (!['corrida', 'caminhada', 'trilha'].includes(tipo)) {
    return res.status(400).json({
      erro: 'tipo_invalido',
      mensagem: 'Tipo da atividade deve ser corrida, caminhada ou trilha',
    });
  }

  // Regras 3.2 e 3.3: valores numéricos
  if (isNaN(distancia_metros) || isNaN(duracao_minutos) || isNaN(calorias)) {
    return res.status(400).json({
      erro: 'valor_invalido',
      mensagem: 'Distância, duração e calorias devem ser numéricos',
    });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO atividades (usuario_id, tipo, distancia_metros, duracao_minutos, calorias)
       VALUES (?, ?, ?, ?, ?)`,
      [usuario_id, tipo, distancia_metros, duracao_minutos, calorias]
    );

    const [rows] = await pool.query(
      `SELECT a.id, a.tipo, a.usuario_id, a.distancia_metros, a.duracao_minutos,
              a.calorias, a.criado_em, u.nome AS usuario_nome, u.foto AS usuario_foto,
              0 AS qtd_likes, 0 AS qtd_comentarios, 0 AS curtido_por_mim
       FROM atividades a JOIN usuarios u ON u.id = a.usuario_id
       WHERE a.id = ?`,
      [result.insertId]
    );

    return res.status(201).json(formatarAtividade(rows[0], usuario_id));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'erro_servidor' });
  }
});

router.post('/:id/like', async (req, res) => {
  const { id } = req.params;
  const { usuario_id } = req.body;

  if (!usuario_id) {
    return res.status(400).json({ erro: 'campo_obrigatorio', mensagem: 'usuario_id é obrigatório' });
  }

  try {
    const [existente] = await pool.query(
      'SELECT id FROM likes WHERE atividade_id = ? AND usuario_id = ?',
      [id, usuario_id]
    );

    let curtido;
    if (existente.length > 0) {
      await pool.query('DELETE FROM likes WHERE id = ?', [existente[0].id]);
      curtido = false;
    } else {
      await pool.query(
        'INSERT INTO likes (atividade_id, usuario_id) VALUES (?, ?)',
        [id, usuario_id]
      );
      curtido = true;
    }

    const [totalRows] = await pool.query(
      'SELECT COUNT(*) AS qtd_likes FROM likes WHERE atividade_id = ?',
      [id]
    );

    return res.json({ atividade_id: Number(id), curtido, qtd_likes: totalRows[0].qtd_likes });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'erro_servidor' });
  }
});

router.post('/:id/comentarios', async (req, res) => {
  const { id } = req.params;
  const { usuario_id, texto } = req.body;

  if (!usuario_id) {
    return res.status(400).json({ erro: 'campo_obrigatorio', mensagem: 'usuario_id é obrigatório' });
  }

  if (!texto || texto.trim().length === 0) {
    return res.status(400).json({
      erro: 'comentario_vazio',
      mensagem: 'não é possível enviar um comentário vazio',
    });
  }

  if (texto.trim().length <= 2) {
    return res.status(400).json({
      erro: 'comentario_curto',
      mensagem: 'O comentário deve ter mais de 2 caracteres',
    });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO comentarios (atividade_id, usuario_id, texto) VALUES (?, ?, ?)',
      [id, usuario_id, texto.trim()]
    );

    const [totalRows] = await pool.query(
      'SELECT COUNT(*) AS qtd_comentarios FROM comentarios WHERE atividade_id = ?',
      [id]
    );

    return res.status(201).json({
      id: result.insertId,
      atividade_id: Number(id),
      texto: texto.trim(),
      qtd_comentarios: totalRows[0].qtd_comentarios, 
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'erro_servidor' });
  }
});

module.exports = router;