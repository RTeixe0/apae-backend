// scripts/seed_demo_data.js
import db from '../config/mysql.js';

// compradores fixos (já existem no banco)
const BUYERS = [
  { id: 2, email: 'renan@renan.com' },
  { id: 3, email: 'user@user.com' },
];

// admin e staff que fazem o scan
const SCANNERS = [1, 4]; // 1 = Admin, 4 = Staff

// ------------------------------------------
// 🔧 Função robusta para converter datas
// - Aceita DATE
// - Aceita DATETIME
// - Aceita TIME ("18:00:00")
// - Garante sempre retorno válido
// ------------------------------------------
function parseDateTime(dateValue, timeValue) {
  if (!dateValue) return null;

  // Se vier DATE + TIME separados
  if (timeValue && /^\d{2}:\d{2}:\d{2}$/.test(timeValue)) {
    return new Date(`${dateValue}T${timeValue}`);
  }

  // Se vier algo completo (datetime string)
  if (typeof dateValue === 'string' && dateValue.includes(' ')) {
    const d = new Date(dateValue);
    if (!isNaN(d)) return d;
  }

  // Se vier apenas um DATE puro
  const dateStr = typeof dateValue === 'string' ? dateValue : dateValue.toISOString().split('T')[0];

  // Se timeValue for inválido, cai no horário 00:00:00
  return new Date(`${dateStr}T${timeValue || '00:00:00'}`);
}

// adiciona minutos a uma data
function addMinutes(date, minutes) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

async function seedDemoData() {
  console.log('🧹 Limpando dados antigos (tickets/payments/validations/logs)...');
  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  await db.query('TRUNCATE TABLE validations');
  await db.query('TRUNCATE TABLE logs');
  await db.query('TRUNCATE TABLE tickets');
  await db.query('TRUNCATE TABLE payments');
  await db.query('SET FOREIGN_KEY_CHECKS = 1');

  console.log('📥 Buscando eventos...');
  const [events] = await db.query('SELECT * FROM events ORDER BY id');

  let totalTickets = 0;
  let totalValidations = 0;

  for (const event of events) {
    const sold = event.sold_count;
    if (!sold || sold <= 0) {
      console.log(`➡️ Evento ${event.id} - "${event.nome}" sem vendas (sold_count = 0).`);
      continue;
    }

    const price = event.ticket_price;
    const isFinished = event.status === 'finished';

    // % de ingressos usados
    let used = 0;
    if (isFinished) {
      if (event.nome === 'Corrida da Inclusão') used = Math.floor(sold * 0.5);
      else used = Math.floor(sold * 0.85);
    }

    console.log(
      `🎉 Evento ${event.id} - "${event.nome}": vendidos=${sold}, usados=${used}, emitidos=${
        sold - used
      }`,
    );

    // DATE do evento
    const eventDate = parseDateTime(event.data, '00:00:00');

    // START_TIME robusto
    const startAt = parseDateTime(event.data, event.starts_at?.split(' ')[1] || event.starts_at);

    for (let i = 1; i <= sold; i++) {
      const buyer = BUYERS[(i + event.id) % BUYERS.length];
      const code = `EV${String(event.id).padStart(2, '0')}-T${String(i).padStart(3, '0')}`;
      const isUsed = i <= used;

      // Pagamento: 1 dia antes, meio-dia
      const paidAt = new Date(eventDate);
      paidAt.setDate(paidAt.getDate() - 1);
      paidAt.setHours(12, 0, 0, 0);

      const providerOptions = ['pix', 'stripe', 'mercadopago'];
      const provider = providerOptions[i % providerOptions.length];
      const transactionRef = `PAY-EV${String(event.id).padStart(2, '0')}-T${String(i).padStart(
        3,
        '0',
      )}`;

      // 1️⃣ PAYMENT
      const [paymentResult] = await db.query(
        `INSERT INTO payments
             (user_id, event_id, provider, status, amount, currency, transaction_ref, payload_json, paid_at)
           VALUES (?, ?, ?, 'paid', ?, 'BRL', ?, NULL, ?)`,
        [buyer.id, event.id, provider, price, transactionRef, paidAt],
      );
      const paymentId = paymentResult.insertId;

      // 2️⃣ TICKET
      let validatedAt = null;
      let validatedBy = null;

      if (isUsed && startAt) {
        validatedAt = addMinutes(startAt, 5 + (i % 25));
        validatedBy = SCANNERS[i % SCANNERS.length];
      }

      const [ticketResult] = await db.query(
        `INSERT INTO tickets
             (code, event_id, user_id, buyer_email, payment_id, price_paid, status, qr_url, validated_at, validated_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
        [
          code,
          event.id,
          buyer.id,
          buyer.email,
          paymentId,
          price,
          isUsed ? 'used' : 'issued',
          validatedAt,
          validatedBy,
        ],
      );

      const ticketId = ticketResult.insertId;
      totalTickets++;

      // 3️⃣ VALIDATION + LOG
      if (isUsed && validatedAt) {
        await db.query(
          `INSERT INTO validations
               (ticket_id, event_id, scanner_id, scanned_at, location, meta_json)
             VALUES (?, ?, ?, ?, 'Entrada principal', NULL)`,
          [ticketId, event.id, validatedBy, validatedAt],
        );

        await db.query(
          `INSERT INTO logs (ticketId, scannerId, timestamp)
           VALUES (?, ?, ?)`,
          [ticketId, String(validatedBy), validatedAt],
        );

        totalValidations++;
      }
    }
  }

  console.log('✅ Seed concluído!');
  console.log(`➡️ Tickets criados: ${totalTickets}`);
  console.log(`➡️ Validações criadas: ${totalValidations}`);
  process.exit(0);
}

seedDemoData().catch((err) => {
  console.error('❌ Erro no seed:', err);
  process.exit(1);
});
