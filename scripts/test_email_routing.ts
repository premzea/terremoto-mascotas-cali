import nodemailer from "nodemailer";

async function testGmailDispatch() {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: "busquedanimalcali@gmail.com",
      pass: "spfxviwhibnamcwd",
    },
    tls: { rejectUnauthorized: false },
  });

  console.log("Verifying SMTP handshake...");
  await transporter.verify();
  console.log("SMTP handshake successful!");

  console.log("Sending test email to busquedaanimalcali.pruebas@gmail.com...");
  const info = await transporter.sendMail({
    from: '"Búsqueda Animal Cali [TEST]" <busquedanimalcali@gmail.com>',
    to: "busquedaanimalcali.pruebas@gmail.com",
    subject: "🧪 Test de Notificación Automática - Búsqueda Animal Cali",
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #059669;">🧪 Correo de Prueba Exitoso</h2>
        <p>Este correo confirma que todos los tests E2E y pruebas automatizadas ahora se redirigen a <strong>busquedaanimalcali.pruebas@gmail.com</strong> para no saturar la bandeja de producción real.</p>
      </div>
    `,
  });

  console.log("Email sent successfully! MessageId:", info.messageId);
}

testGmailDispatch().catch(console.error);
