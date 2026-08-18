import nodemailer from "nodemailer";

const DEFAULT_EMAIL_USER = "busquedanimalcali@gmail.com";
const DEFAULT_EMAIL_PASS = "spfxviwhibnamcwd";

const rawUser = (process.env.EMAIL_USER || "").trim();
const rawPass = (process.env.EMAIL_PASS || "").replace(/\s+/g, "");

export const EMAIL_USER = rawUser && rawUser.includes("@") ? rawUser : DEFAULT_EMAIL_USER;
export const EMAIL_PASS = rawPass && rawPass.length === 16 ? rawPass : DEFAULT_EMAIL_PASS;
export const PROD_NOTIFICATION_EMAIL = "busquedanimalcali@gmail.com";
export const TEST_NOTIFICATION_EMAIL = "busquedaanimalcali.pruebas@gmail.com";

export function resolveRecipientEmail(petOrData?: any): string {
  if (process.env.NOTIFICATION_EMAIL_TO) {
    return process.env.NOTIFICATION_EMAIL_TO;
  }
  const isTest =
    process.env.NODE_ENV === "test" ||
    petOrData?.isTest ||
    petOrData?.id?.startsWith("TEST") ||
    petOrData?.targetPet?.id?.startsWith("TEST") ||
    petOrData?.candidatePet?.id?.startsWith("TEST") ||
    petOrData?.name?.toLowerCase().includes("test") ||
    petOrData?.contact_name?.toLowerCase().includes("test") ||
    petOrData?.contact_phone?.includes("000");

  return isTest ? TEST_NOTIFICATION_EMAIL : PROD_NOTIFICATION_EMAIL;
}

export function getTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

export async function sendNewReportEmail(pet: any) {
  const transporter = getTransporter();
  const recipientEmail = resolveRecipientEmail(pet);

  const isLost = pet.report_type === "LOST";
  const typeLabel = isLost ? "🚨 MASCOTA BUSCADA / PERDIDA" : "🐶 MASCOTA ENCONTRADA / RESCATADA";

  const attachments: any[] = [];
  let photoHtml = "";

  if (pet.photo_url && typeof pet.photo_url === "string") {
    if (pet.photo_url.startsWith("data:image")) {
      const match = pet.photo_url.match(/^data:image\/(\w+);base64,(.+)$/);
      if (match) {
        const ext = match[1] || "jpeg";
        const base64Data = match[2];
        attachments.push({
          filename: `foto_${pet.id}.${ext}`,
          content: Buffer.from(base64Data, "base64"),
          cid: "petphoto_cid",
        });
        photoHtml = `
          <div style="text-align: center; margin-top: 15px;">
            <p style="font-size: 12px; color: #71717a; margin-bottom: 8px;">Foto del reporte:</p>
            <img src="cid:petphoto_cid" alt="${pet.name}" style="max-width: 100%; max-height: 350px; border-radius: 8px; border: 1px solid #d4d4d8; object-fit: contain;" />
          </div>
        `;
      }
    } else if (!pet.photo_url.startsWith("blob:") && !pet.photo_url.startsWith("/")) {
      photoHtml = `
        <div style="text-align: center; margin-top: 15px;">
          <p style="font-size: 12px; color: #71717a; margin-bottom: 8px;">Foto del reporte:</p>
          <img src="${pet.photo_url}" alt="${pet.name}" style="max-width: 100%; max-height: 350px; border-radius: 8px; border: 1px solid #d4d4d8; object-fit: contain;" />
        </div>
      `;
    }
  }

  const isTest = recipientEmail === TEST_NOTIFICATION_EMAIL;
  const mailOptions = {
    from: `"Búsqueda Animal Cali${isTest ? ' [TEST]' : ''}" <${EMAIL_USER}>`,
    to: recipientEmail,
    subject: `${isTest ? '🧪 [TEST] ' : ''}[NUEVO REPORTE ${pet.id}] ${typeLabel}: ${pet.name} (${pet.species})`,
    attachments,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9fb; border: 1px solid #e1e1e6; border-radius: 12px; overflow: hidden;">
        <div style="background: #121214; color: #fff; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px; color: #f59e0b;">Búsqueda Animal Cali${isTest ? ' <span style="font-size:12px; background:#4b5563; padding:2px 8px; border-radius:4px;">AMBIENTE DE PRUEBAS</span>' : ''}</h1>
          <p style="margin: 5px 0 0 0; font-size: 13px; color: #a1a1aa;">Nuevo reporte registrado en el sistema</p>
        </div>
        
        <div style="padding: 24px; color: #18181b;">
          <div style="background: #fff; border: 1px solid #e4e4e7; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #09090b; border-bottom: 1px solid #f4f4f5; padding-bottom: 8px;">
              Detalles de la Mascota (ID: <strong>${pet.id}</strong>)
            </h2>
            <p style="margin: 6px 0;"><strong>Tipo:</strong> ${pet.report_type === "LOST" ? "Perdida / Buscada" : "Encontrada / Rescatada"}</p>
            <p style="margin: 6px 0;"><strong>Nombre:</strong> ${pet.name || "Sin nombre"}</p>
            <p style="margin: 6px 0;"><strong>Especie:</strong> ${pet.species === "DOG" ? "Perro 🐶" : pet.species === "CAT" ? "Gato 🐱" : pet.species}</p>
            <p style="margin: 6px 0;"><strong>Sexo:</strong> ${pet.gender || "Desconocido"}</p>
            <p style="margin: 6px 0;"><strong>Color / Pelaje:</strong> ${pet.primary_color || "No especificado"}</p>
            <p style="margin: 6px 0;"><strong>Tamaño:</strong> ${pet.size || "MEDIANO"}</p>
            <p style="margin: 6px 0;"><strong>Barrio:</strong> ${pet.neighborhood || "No especificado"}</p>
            <p style="margin: 6px 0;"><strong>Rasgos Distintivos:</strong> ${pet.distinctive_features || "Ninguno"}</p>
          </div>

          <div style="background: #fff; border: 1px solid #e4e4e7; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #09090b;">Contacto del Reportante</h3>
            <p style="margin: 6px 0;"><strong>Nombre:</strong> ${pet.contact_name || "Anónimo"}</p>
            <p style="margin: 6px 0;"><strong>Teléfono / WhatsApp:</strong> ${pet.contact_phone || "No proporcionado"}</p>
          </div>

          ${photoHtml}
        </div>
        
        <div style="background: #f4f4f5; padding: 12px 20px; text-align: center; font-size: 11px; color: #71717a;">
          Sistema de Respuesta y Triaje Animal Cali
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

export async function sendMatchContactEmail(data: {
  targetPet: any;
  candidatePet: any;
  score: number;
  reasons: string[];
  userMessage?: string;
}) {
  const transporter = getTransporter();
  const recipientEmail = resolveRecipientEmail(data);
  const { targetPet, candidatePet, score, reasons, userMessage } = data;
  const isTest = recipientEmail === TEST_NOTIFICATION_EMAIL;

  const mailOptions = {
    from: `"Búsqueda Animal Cali${isTest ? ' [TEST]' : ''}" <${EMAIL_USER}>`,
    to: recipientEmail,
    subject: `${isTest ? '🧪 [TEST] ' : ''}🤝 [COINCIDENCIA IA ${score}%] Comunícate: ${targetPet.id} (${targetPet.name}) con ${candidatePet.id} (${candidatePet.name})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #f9f9fb; border: 1px solid #e1e1e6; border-radius: 12px; overflow: hidden;">
        <div style="background: #121214; color: #fff; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px; color: #10b981;">¡Solicitud de Comunicación de Coincidencia!</h1>
          <p style="margin: 5px 0 0 0; font-size: 13px; color: #a1a1aa;">Un usuario solicita conectar estas dos mascotas</p>
        </div>

        <div style="padding: 24px; color: #18181b;">
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; text-align: center;">
            <span style="font-size: 18px; font-weight: bold; color: #065f46;">Puntaje de Similitud IA: ${score}%</span>
            <div style="margin-top: 6px; font-size: 12px; color: #047857;">
              ${reasons.join(" • ")}
            </div>
          </div>

          ${userMessage ? `
          <div style="background: #fff; border: 1px solid #e4e4e7; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
            <strong>Mensaje o nota del usuario:</strong>
            <p style="margin: 5px 0 0 0; font-style: italic; color: #3f3f46;">${userMessage}</p>
          </div>
          ` : ''}

          <div style="display: flex; gap: 15px; margin-bottom: 20px;">
            <!-- Target Pet -->
            <div style="flex: 1; background: #fff; border: 1px solid #e4e4e7; border-radius: 8px; padding: 14px;">
              <div style="background: #27272a; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block; margin-bottom: 8px;">
                Mascota Objetivo (${targetPet.report_type === "LOST" ? "Buscada" : "Encontrada"})
              </div>
              <h3 style="margin: 0 0 6px 0; font-size: 15px;">${targetPet.name} (ID: ${targetPet.id})</h3>
              <p style="font-size: 12px; margin: 4px 0;"><strong>Especie:</strong> ${targetPet.species}</p>
              <p style="font-size: 12px; margin: 4px 0;"><strong>Color:</strong> ${targetPet.primary_color}</p>
              <p style="font-size: 12px; margin: 4px 0;"><strong>Barrio:</strong> ${targetPet.neighborhood}</p>
              <p style="font-size: 12px; margin: 4px 0;"><strong>Contacto:</strong> ${targetPet.contact_name || "N/A"} - ${targetPet.contact_phone || "N/A"}</p>
              ${targetPet.photo_url ? `
                <img src="${targetPet.photo_url}" alt="${targetPet.name}" style="width: 100%; height: 160px; object-fit: contain; background: #000; border-radius: 6px; margin-top: 8px;" />
              ` : ''}
            </div>

            <!-- Candidate Pet -->
            <div style="flex: 1; background: #fff; border: 1px solid #e4e4e7; border-radius: 8px; padding: 14px;">
              <div style="background: #27272a; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block; margin-bottom: 8px;">
                Mascota Candidata (${candidatePet.report_type === "LOST" ? "Buscada" : "Encontrada"})
              </div>
              <h3 style="margin: 0 0 6px 0; font-size: 15px;">${candidatePet.name} (ID: ${candidatePet.id})</h3>
              <p style="font-size: 12px; margin: 4px 0;"><strong>Especie:</strong> ${candidatePet.species}</p>
              <p style="font-size: 12px; margin: 4px 0;"><strong>Color:</strong> ${candidatePet.primary_color}</p>
              <p style="font-size: 12px; margin: 4px 0;"><strong>Barrio:</strong> ${candidatePet.neighborhood}</p>
              <p style="font-size: 12px; margin: 4px 0;"><strong>Contacto:</strong> ${candidatePet.contact_name || "N/A"} - ${candidatePet.contact_phone || "N/A"}</p>
              ${candidatePet.photo_url ? `
                <img src="${candidatePet.photo_url}" alt="${candidatePet.name}" style="width: 100%; height: 160px; object-fit: contain; background: #000; border-radius: 6px; margin-top: 8px;" />
              ` : ''}
            </div>
          </div>
        </div>

        <div style="background: #f4f4f5; padding: 12px 20px; text-align: center; font-size: 11px; color: #71717a;">
          Búsqueda Animal Cali • Sistema de Triaje y Emparejamiento
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

export async function sendCaseClosedEmail(petId: string, petName?: string) {
  const transporter = getTransporter();
  const recipientEmail = resolveRecipientEmail({ id: petId, name: petName });
  const isTest = recipientEmail === TEST_NOTIFICATION_EMAIL;

  const mailOptions = {
    from: `"Búsqueda Animal Cali${isTest ? ' [TEST]' : ''}" <${EMAIL_USER}>`,
    to: recipientEmail,
    subject: `${isTest ? '🧪 [TEST] ' : ''}✅ [CASO CERRADO] Caso ID ${petId} (${petName || 'Mascota'}) marcado como REUNIDO`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #f9f9fb; border: 1px solid #e1e1e6; border-radius: 12px; overflow: hidden;">
        <div style="background: #121214; color: #fff; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px; color: #10b981;">Búsqueda Animal Cali</h1>
          <p style="margin: 5px 0 0 0; font-size: 13px; color: #a1a1aa;">Reporte Marcado como Reunido / Cerrado</p>
        </div>

        <div style="padding: 24px; color: #18181b; text-align: center;">
          <p style="font-size: 15px; color: #15803d; font-weight: bold; margin-bottom: 12px;">
            🎉 ¡El caso de ${petName || 'la mascota'} (ID: ${petId}) ha sido cerrado exitosamente!
          </p>
          <p style="font-size: 13px; color: #52525b; line-height: 1.5;">
            El reporte ha sido retirado de las listas activas y marcado como resuelto con el código maestro de administración.
          </p>
        </div>

        <div style="background: #f4f4f5; padding: 12px 20px; text-align: center; font-size: 11px; color: #71717a;">
          Búsqueda Animal Cali • Administración
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}
