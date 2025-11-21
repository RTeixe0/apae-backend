-- ======================================================
-- 🔧 CONFIGURAÇÕES INICIAIS
-- ======================================================
SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

-- ======================================================
-- 👥 TABELA: USERS
-- ======================================================
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id INT NOT NULL AUTO_INCREMENT,
  cognito_sub VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  role ENUM('admin','staff','default') NOT NULL DEFAULT 'default',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_cognito (cognito_sub),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================
-- 🎉 TABELA: EVENTS
-- ======================================================
DROP TABLE IF EXISTS events;
CREATE TABLE events (
  id INT NOT NULL AUTO_INCREMENT,
  nome VARCHAR(150) NOT NULL,
  local VARCHAR(255) NOT NULL,
  data DATE NOT NULL,
  starts_at DATETIME DEFAULT NULL,
  ends_at DATETIME DEFAULT NULL,
  banner_url TEXT DEFAULT NULL,
  capacity INT NOT NULL DEFAULT 0,
  sold_count INT NOT NULL DEFAULT 0,
  ticket_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status ENUM('draft','published','canceled','finished') NOT NULL DEFAULT 'published',
  created_by INT DEFAULT NULL,

  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_events_created_by (created_by),
  KEY idx_events_date (data),
  KEY idx_events_status (status),

  CONSTRAINT fk_events_created_by FOREIGN KEY (created_by)
    REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT chk_capacity CHECK (capacity >= 0),
  CONSTRAINT chk_sold CHECK (sold_count >= 0),
  CONSTRAINT chk_price CHECK (ticket_price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================
-- 💳 TABELA: PAYMENTS
-- ======================================================
DROP TABLE IF EXISTS payments;
CREATE TABLE payments (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  provider VARCHAR(50) NOT NULL,
  status ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'BRL',
  transaction_ref VARCHAR(100) DEFAULT NULL,
  payload_json JSON DEFAULT NULL,
  paid_at DATETIME DEFAULT NULL,

  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY ux_payments_provider_ref (provider, transaction_ref),

  KEY idx_payments_user (user_id),
  KEY idx_payments_event (event_id),
  KEY idx_payments_status (status),

  CONSTRAINT fk_payments_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_payments_event FOREIGN KEY (event_id)
    REFERENCES events (id) ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT chk_payment_amount CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================
-- 🎟️ TABELA: TICKETS
-- ======================================================
DROP TABLE IF EXISTS tickets;
CREATE TABLE tickets (
  id INT NOT NULL AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  event_id INT NOT NULL,
  user_id INT NOT NULL,
  buyer_email VARCHAR(255) DEFAULT NULL,
  payment_id INT DEFAULT NULL,
  price_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status ENUM('issued','used','canceled','refunded') NOT NULL DEFAULT 'issued',
  qr_url TEXT DEFAULT NULL,
  validated_at DATETIME DEFAULT NULL,
  validated_by INT DEFAULT NULL,

  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_tickets_code (code),
  KEY idx_tickets_event (event_id),
  KEY idx_tickets_user (user_id),
  KEY idx_tickets_payment (payment_id),
  KEY idx_tickets_status (status),
  KEY idx_tickets_validator (validated_by),

  CONSTRAINT fk_tickets_event FOREIGN KEY (event_id)
    REFERENCES events (id) ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_tickets_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_tickets_payment FOREIGN KEY (payment_id)
    REFERENCES payments (id) ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT fk_tickets_validator FOREIGN KEY (validated_by)
    REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT chk_ticket_price CHECK (price_paid >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================
-- 🧾 TABELA: VALIDATIONS (CHECK-IN LOG)
-- ======================================================
DROP TABLE IF EXISTS validations;
CREATE TABLE validations (
  id INT NOT NULL AUTO_INCREMENT,
  ticket_id INT NOT NULL,
  event_id INT NOT NULL,  -- 🔥 ADICIONADO
  scanner_id INT DEFAULT NULL,
  scanned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  location VARCHAR(120) DEFAULT NULL,
  meta_json JSON DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_validations_ticket (ticket_id),
  KEY idx_validations_scanner (scanner_id),
  KEY idx_validations_event (event_id),

  CONSTRAINT fk_validations_ticket FOREIGN KEY (ticket_id)
    REFERENCES tickets (id) ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_validations_event FOREIGN KEY (event_id)
    REFERENCES events (id) ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_validations_scanner FOREIGN KEY (scanner_id)
    REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================
-- 📋 TABELA: LOGS (AUDITORIA SIMPLES)
-- ======================================================
DROP TABLE IF EXISTS logs;
CREATE TABLE logs (
  id INT NOT NULL AUTO_INCREMENT,
  ticketId INT NOT NULL,
  scannerId VARCHAR(100) DEFAULT NULL,
  timestamp TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_logs_ticketId (ticketId),
  CONSTRAINT fk_logs_ticket FOREIGN KEY (ticketId)
    REFERENCES tickets (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================
-- 📊 VIEW: v_event_sales (REVISADA)
-- ======================================================
CREATE OR REPLACE VIEW v_event_sales AS
SELECT
  e.id AS event_id,
  e.nome AS event_name,
  e.data AS data,
  e.ticket_price,
  e.capacity,
  e.sold_count,

  -- Contagens reais
  (SELECT COUNT(*) FROM tickets t2 WHERE t2.event_id = e.id AND t2.status = 'issued') AS tickets_issued,
  (SELECT COUNT(*) FROM tickets t3 WHERE t3.event_id = e.id AND t3.status = 'used') AS tickets_used,

  -- Faturamento
  (SELECT COALESCE(SUM(t4.price_paid),0)
     FROM tickets t4
     WHERE t4.event_id = e.id AND t4.status IN ('issued','used')
  ) AS revenue,

  -- Restantes
  GREATEST(e.capacity - e.sold_count, 0) AS remaining

FROM events e;

-- ======================================================
-- 📊 VIEW: v_event_checkins (REVISADA)
-- ======================================================
CREATE OR REPLACE VIEW v_event_checkins AS
SELECT
  e.id AS event_id,
  e.nome AS event_name,

  COUNT(v.id) AS total_scans,
  COUNT(DISTINCT v.ticket_id) AS unique_tickets_scanned,

  MIN(v.scanned_at) AS first_scan_at,
  MAX(v.scanned_at) AS last_scan_at

FROM events e
LEFT JOIN validations v ON v.event_id = e.id
GROUP BY e.id, e.nome;

-- ======================================================
-- 🔚 FINALIZAÇÃO
-- ======================================================
SET foreign_key_checks = 1;
