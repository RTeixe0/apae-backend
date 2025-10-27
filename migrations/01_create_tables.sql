-- Migration: Criação das tabelas do sistema de eventos e tickets

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role ENUM('admin','collaborator','user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela de eventos
CREATE TABLE IF NOT EXISTS events (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    local VARCHAR(255) NOT NULL,
    data DATE NOT NULL,
    bannerUrl TEXT,
    organizadorId INT,
    capacidade INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (organizadorId),
    FOREIGN KEY (organizadorId) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela de tickets
CREATE TABLE IF NOT EXISTS tickets (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    eventId INT NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    usado TINYINT(1) DEFAULT 0,
    qrUrl TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (eventId),
    FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela de logs
CREATE TABLE IF NOT EXISTS logs (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    ticketId INT NOT NULL,
    scannerId VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (ticketId),
    FOREIGN KEY (ticketId) REFERENCES tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Inserir usuário admin de exemplo
INSERT INTO users (nome, email, role) VALUES 
    ('Administrador', 'admin@eventos.com', 'admin');

-- Inserir evento de exemplo
INSERT INTO events (nome, local, data, organizadorId, capacidade) VALUES 
    ('Evento Teste', 'Centro de Convenções', '2025-12-31', 1, 500);