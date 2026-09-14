CREATE DATABASE IF NOT EXISTS saepsaude
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE saepsaude;

CREATE TABLE empresa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    logo VARCHAR(255) NOT NULL DEFAULT 'SAEPSaude.png',
    instagram VARCHAR(255) DEFAULT '#',
    twitter VARCHAR(255) DEFAULT '#',
    tiktok VARCHAR(255) DEFAULT '#',
    copyright_ano VARCHAR(20) DEFAULT '2025/2026'
);

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    foto VARCHAR(255) DEFAULT 'default-user.png',
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE atividades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    tipo ENUM('corrida', 'caminhada', 'trilha') NOT NULL,
    distancia_metros DECIMAL(10,2) NOT NULL,
    duracao_minutos INT NOT NULL,
    calorias INT NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_atividade_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE
);

CREATE TABLE likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    atividade_id INT NOT NULL,
    usuario_id INT NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_like_atividade
        FOREIGN KEY (atividade_id) REFERENCES atividades(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_like_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_like_unico UNIQUE (atividade_id, usuario_id)
);

CREATE TABLE comentarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    atividade_id INT NOT NULL,
    usuario_id INT NOT NULL,
    texto VARCHAR(500) NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comentario_atividade
        FOREIGN KEY (atividade_id) REFERENCES atividades(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_comentario_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_atividades_tipo ON atividades(tipo);
CREATE INDEX idx_atividades_criado_em ON atividades(criado_em);
CREATE INDEX idx_likes_atividade ON likes(atividade_id);
CREATE INDEX idx_comentarios_atividade ON comentarios(atividade_id);

INSERT INTO empresa (
    nome,
    logo,
    instagram,
    twitter,
    tiktok,
    copyright_ano
)
VALUES (
    'SAEPSaúde',
    'SAEPSaude.png',
    '#',
    '#',
    '#',
    '2025/2026'
);