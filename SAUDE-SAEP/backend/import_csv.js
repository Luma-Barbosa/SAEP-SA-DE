require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const bcrypt = require('bcryptjs');
const pool = require('./db');

const USUARIOS_CSV = path.join(__dirname, 'data', 'usuarios.csv');
const ATIVIDADES_CSV = path.join(__dirname, 'data', 'atividades.csv');

function lerCsv(caminho) {
  return new Promise((resolve, reject) => {
    const linhas = [];
    if (!fs.existsSync(caminho)) {
      console.warn(`Arquivo não encontrado, pulando: ${caminho}`);
      return resolve(linhas);
    }
    fs.createReadStream(caminho)
      .pipe(csv())
      .on('data', (row) => linhas.push(row))
      .on('end', () => resolve(linhas))
      .on('error', reject);
  });
}

function mapUsuario(row) {
  return {
    nome: row.nome || row.name || row.usuario || '',
    email: row.email || `${(row.nome || 'usuario').toLowerCase().replace(/\s+/g, '.')}@saepsaude.com`,
    senha: row.senha || row.password || '123456', // senha padrão para dados do protótipo
    foto: row.foto || row.photo || 'default-user.png',
  };
}

function mapAtividade(row) {
  return {
    usuario_email: row.email || row.usuario_email || null,
    usuario_nome: row.usuario || row.nome_usuario || row.nome || null,
    tipo: (row.tipo || row.atividade || '').toLowerCase(),
    distancia_metros: Number(row.distancia_metros || row.distancia || 0),
    duracao_minutos: Number(row.duracao_minutos || row.duracao || 0),
    calorias: Number(row.calorias || 0),
    criado_em: row.data || row.criado_em || null,
  };
}

async function importarUsuarios() {
  const linhas = await lerCsv(USUARIOS_CSV);
  console.log(`usuarios.csv: ${linhas.length} linha(s) encontradas`);
  const emailParaId = {};

  for (const linhaCrua of linhas) {
    const u = mapUsuario(linhaCrua);
    if (!u.nome || !u.email) continue;

    const [existentes] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [u.email]);
    if (existentes.length > 0) {
      emailParaId[u.email] = existentes[0].id;
      continue;
    }

    const hash = await bcrypt.hash(u.senha, 10);
    const [result] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha, foto) VALUES (?, ?, ?, ?)',
      [u.nome, u.email, hash, u.foto]
    );
    emailParaId[u.email] = result.insertId;
    console.log(`  + usuário criado: ${u.nome} (${u.email})`);
  }
  return emailParaId;
}

async function importarAtividades(emailParaId) {
  const linhas = await lerCsv(ATIVIDADES_CSV);
  console.log(`atividades.csv: ${linhas.length} linha(s) encontradas`);
  let inseridas = 0;

  for (const linhaCrua of linhas) {
    const a = mapAtividade(linhaCrua);
    if (!['corrida', 'caminhada', 'trilha'].includes(a.tipo)) continue;

    let usuarioId = a.usuario_email ? emailParaId[a.usuario_email] : null;

    if (!usuarioId && a.usuario_nome) {
      const [rows] = await pool.query('SELECT id FROM usuarios WHERE nome = ? LIMIT 1', [a.usuario_nome]);
      if (rows.length > 0) usuarioId = rows[0].id;
    }
    if (!usuarioId) {
      console.warn('  ! atividade ignorada (usuário não encontrado):', linhaCrua);
      continue;
    }

    if (a.criado_em) {
      await pool.query(
        `INSERT INTO atividades (usuario_id, tipo, distancia_metros, duracao_minutos, calorias, criado_em)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [usuarioId, a.tipo, a.distancia_metros, a.duracao_minutos, a.calorias, a.criado_em]
      );
    } else {
      await pool.query(
        `INSERT INTO atividades (usuario_id, tipo, distancia_metros, duracao_minutos, calorias)
         VALUES (?, ?, ?, ?, ?)`,
        [usuarioId, a.tipo, a.distancia_metros, a.duracao_minutos, a.calorias]
      );
    }
    inseridas += 1;
  }
  console.log(`  + ${inseridas} atividade(s) importada(s)`);
}

(async () => {
  try {
    const emailParaId = await importarUsuarios();
    await importarAtividades(emailParaId);
    console.log('Importação concluída com sucesso.');
  } catch (err) {
    console.error('Erro na importação:', err);
  } finally {
    await pool.end();
  }
})();