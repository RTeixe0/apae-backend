// scripts/seed_demo_data.js
import db from '../config/mysql.js'; // ajusta o caminho se precisar

// compradores fixos (já existem no banco)
const BUYERS = [
  { id: 2, email: 'renan@renan.com' },
  { id: 3, email: 'user@user.com' },
];

// admin e staff que fazem o scan
const SCANNERS = [1, 4]; // 1 = Admin, 4 = Staff

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
      console.log(
        `➡️  Evento ${event.id} - "${event.nome}" sem vendas (sold_count = 0), pulando...`,
      );
      continue;
    }

    const price = event.ticket_price;
    const isFinished = event.status === 'finished';

    // regra: eventos "finished" têm parte dos ingressos usados
    let used = 0;
    if (isFinished) {
      if (event.nome === 'Corrida da Inclusão') {
        used = Math.floor(sold * 0.5); // 50% usados
      } else {
        used = Math.floor(sold * 0.85); // ~85% usados
      }
    } else {
      used = 0; // eventos futuros / publicados ainda sem uso
    }

    console.log(
      `🎉 Evento ${event.id} - "${event.nome}": sold=${sold}, usados=${used}, emitidos=${
        sold - used
      }`,
    );

    const eventDate = new Date(event.data); // vem do MySQL como Date
    const startAt = event.starts_at ? new Date(event.starts_at) : new Date(event.data); // fallback se starts_at estiver null

    for (let i = 1; i <= sold; i++) {
      // alterna comprador entre renan e user
      const buyer = BUYERS[(i + event.id) % BUYERS.length];

      const code = `EV${String(event.id).padStart(2, '0')}-T${String(i).padStart(3, '0')}`;
      const isUsed = i <= used;

      // pagamento: dia anterior ao evento, meio-dia
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

      if (isUsed) {
        // validação alguns minutos após o começo do evento
        validatedAt = addMinutes(startAt, 10 + (i % 20));
        validatedBy = SCANNERS[i % SCANNERS.length]; // alterna admin/staff
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

      // 3️⃣ VALIDATION + LOG (apenas se usado)
      if (isUsed && validatedAt && validatedBy) {
        await db.query(
          `INSERT INTO validations
             (ticket_id, event_id, scanner_id, scanned_at, location, meta_json)
           VALUES (?, ?, ?, ?, 'Entrada principal', NULL)`,
          [ticketId, event.id, validatedBy, validatedAt],
        );

        await db.query(
          `INSERT INTO logs
             (ticketId, scannerId, timestamp)
           VALUES (?, ?, ?)`,
          [ticketId, String(validatedBy), validatedAt],
        );

        totalValidations++;
      }
    }
  }

  console.log('✅ Seed finalizado!');
  console.log(`➡️ Tickets criados: ${totalTickets}`);
  console.log(`➡️ Validações criadas: ${totalValidations}`);
  process.exit(0);
}

seedDemoData().catch((err) => {
  console.error('❌ Erro no seed:', err);
  process.exit(1);
});
