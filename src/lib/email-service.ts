import nodemailer from "nodemailer";

export function getEmailCredentials() {
  const user = (process.env.EMAIL_USER || "busquedanimalcali@gmail.com").trim().replace(/['"]/g, "");
  const pass = (process.env.EMAIL_PASS || "").trim().replace(/['"\s]/g, "");
  return { user, pass };
}

export const PROD_NOTIFICATION_EMAIL = "busquedanimalcali@gmail.com";
export const TEST_NOTIFICATION_EMAIL = "busquedaanimalcali.pruebas@gmail.com";

export function resolveRecipientEmail(petOrData?: any, forceIsTest?: boolean): string {
  if (process.env.NOTIFICATION_EMAIL_TO) {
    return process.env.NOTIFICATION_EMAIL_TO.trim().replace(/['"]/g, "");
  }
  const isTest =
    forceIsTest === true ||
    petOrData?.isTest === true ||
    petOrData?.id?.startsWith("TEST") ||
    petOrData?.targetPet?.id?.startsWith("TEST") ||
    petOrData?.candidatePet?.id?.startsWith("TEST");

  return isTest ? TEST_NOTIFICATION_EMAIL : PROD_NOTIFICATION_EMAIL;
}

export function getTransporter() {
  const { user, pass } = getEmailCredentials();
  
  if (!pass) {
    console.warn("⚠️ Warning: EMAIL_PASS is empty in environment variables. Email sending may fail.");
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
}

export async function sendNewReportEmail(pet: any) {
  const { user } = getEmailCredentials();
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
    from: `"Búsqueda Animal Cali${isTest ? ' [TEST]' : ''}" <${user}>`,
    to: recipientEmail,
    subject: `${isTest ? '🧪 [TEST] ' : ''}[NUEVO REPORTE ${pet.id}] ${typeLabel}: ${pet.name} (${pet.species})`,
    attachments,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9fb; border: 1px solid #e1e1e6; border-radius: 12px; overflow: hidden;">
        <div style="background: #121214; color: #fff; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px; color: #f59e0b;">Búsqueda Animal Cali${isTest ? ' <span style="font-size:12px; background:#4b5563; padding:2px 8px; border-radius:4px;">AMBIENTE DE PRUEBAS</span>' : ''}</h1>
          <p style="margin: 5px 0 0 0; font-size: 13px; color: #a1a1aa;">Nuevo reporte registrado en el sistema</p>
        </div>
        
        <div style="padding: 20px;">
          <div style="background: #fff; border: 1px solid #e1e1e6; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 10px 0; font-size: 16px; color: #18181b;">Detalles de la Mascota</h2>
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #71717a; width: 40%;"><strong>ID del Reporte:</strong></td>
                <td style="padding: 6px 0; color: #18181b; font-weight: bold; font-family: monospace;">${pet.id}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #71717a;"><strong>Tipo de Reporte:</strong></td>
                <td style="padding: 6px 0; color: ${isLost ? '#dc2626' : '#16a34a'}; font-weight: bold;">${isLost ? 'Perdida / Buscada' : 'Encontrada / Rescatada'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #71717a;"><strong>Nombre:</strong></td>
                <td style="padding: 6px 0; color: #18181b;">${pet.name || 'Sin nombre'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #71717a;"><strong>Especie / Sexo:</strong></td>
                <td style="padding: 6px 0; color: #18181b;">${pet.species === 'DOG' ? 'Perro' : pet.species === 'CAT' ? 'Gato' : 'Otro'} / ${pet.gender || 'No especificado'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #71717a;"><strong>Tamaño / Color:</strong></td>
                <td style="padding: 6px 0; color: #18181b;">${pet.size || 'Mediano'} / ${pet.primary_color || 'No especificado'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #71717a;"><strong>Ubicación / Barrio:</strong></td>
                <td style="padding: 6px 0; color: #18181b; font-weight: bold;">${pet.neighborhood}</td>
              </tr>
              ${pet.distinctive_features ? `
              <tr>
                <td style="padding: 6px 0; color: #71717a; vertical-align: top;"><strong>Señas / Descripción:</strong></td>
                <td style="padding: 6px 0; color: #18181b;">${pet.distinctive_features}</td>
              </tr>
              ` : ''}
            </table>
            ${photoHtml}
          </div>

          <div style="background: #fff; border: 1px solid #e1e1e6; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 10px 0; font-size: 16px; color: #18181b;">Datos de Contacto del Reportante</h2>
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #71717a; width: 40%;"><strong>Nombre:</strong></td>
                <td style="padding: 6px 0; color: #18181b; font-weight: bold;">${pet.contact_name || 'No especificado'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #71717a;"><strong>Teléfono / WhatsApp:</strong></td>
                <td style="padding: 6px 0; color: #18181b; font-weight: bold; font-family: monospace;">${pet.contact_phone || 'No registrado'}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 25px;">
            <a href="https://busquedanimalcali.vercel.app" style="background: #f59e0b; color: #000; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">Ver en el Tablero de Búsqueda</a>
          </div>
        </div>

        <div style="background: #f4f4f5; border-top: 1px solid #e1e1e6; padding: 15px; text-align: center; font-size: 11px; color: #71717a;">
          <p style="margin: 0;">Sistema de Gestión de Crisis y Rescate Animal • Cali, Valle del Cauca</p>
        </div>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
}

export async function sendMatchFoundEmail(targetPet: any, candidatePet: any, score: number, reasons: string[]) {
  const { user } = getEmailCredentials();
  const transporter = getTransporter();
  const recipientEmail = resolveRecipientEmail(targetPet);
  const isTest = recipientEmail === TEST_NOTIFICATION_EMAIL;

  const reasonsListHtml = reasons && reasons.length > 0
    ? reasons.map((r: string) => `<li style="margin-bottom: 4px;">${r}</li>`).join('')
    : '<li>Coincidencia morfológica y de zona detectada por IA.</li>';

  const mailOptions = {
    from: `"Búsqueda Animal Cali${isTest ? ' [TEST]' : ''}" <${user}>`,
    to: recipientEmail,
    subject: `${isTest ? '🧪 [TEST] ' : ''}✨ ¡POSIBLE COINCIDENCIA (${score}%)! ${targetPet.id} (${targetPet.name}) con ${candidatePet.id} (${candidatePet.name})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9fb; border: 1px solid #e1e1e6; border-radius: 12px; overflow: hidden;">
        <div style="background: #121214; color: #fff; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px; color: #10b981;">¡Posible Coincidencia Detectada! (${score}%)</h1>
          <p style="margin: 5px 0 0 0; font-size: 13px; color: #a1a1aa;">El motor de IA encontró una coincidencia de alta probabilidad</p>
        </div>

        <div style="padding: 20px;">
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #065f46;">Motivos de la Coincidencia:</h3>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #047857;">
              ${reasonsListHtml}
            </ul>
          </div>

          <div style="display: flex; gap: 10px; margin-bottom: 20px;">
            <div style="flex: 1; background: #fff; border: 1px solid #e1e1e6; border-radius: 8px; padding: 12px;">
              <h4 style="margin: 0 0 6px 0; font-size: 13px; color: #dc2626;">Mascota Buscada (${targetPet.id})</h4>
              <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>${targetPet.name}</strong> (${targetPet.species})</p>
              <p style="margin: 0; font-size: 11px; color: #71717a;">Barrio: ${targetPet.neighborhood}</p>
            </div>
            <div style="flex: 1; background: #fff; border: 1px solid #e1e1e6; border-radius: 8px; padding: 12px;">
              <h4 style="margin: 0 0 6px 0; font-size: 13px; color: #16a34a;">Mascota Rescatada (${candidatePet.id})</h4>
              <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>${candidatePet.name}</strong> (${candidatePet.species})</p>
              <p style="margin: 0; font-size: 11px; color: #71717a;">Barrio: ${candidatePet.neighborhood}</p>
            </div>
          </div>

          <div style="text-align: center; margin-top: 20px;">
            <a href="https://busquedanimalcali.vercel.app" style="background: #10b981; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">Revisar Coincidencia en la App</a>
          </div>
        </div>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
}

export async function sendMatchContactEmail(data: any) {
  const { user } = getEmailCredentials();
  const transporter = getTransporter();
  const pet = data?.pet || {};
  const recipientEmail = resolveRecipientEmail(pet);
  const isTest = recipientEmail === TEST_NOTIFICATION_EMAIL;

  const mailOptions = {
    from: `"Búsqueda Animal Cali${isTest ? ' [TEST]' : ''}" <${user}>`,
    to: recipientEmail,
    subject: `${isTest ? '🧪 [TEST] ' : ''}🤝 ¡ALGUIEN CONTACTÓ POR LA MASCOTA ${pet.id || ''}! (${pet.name || 'Sin nombre'})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9fb; border: 1px solid #e1e1e6; border-radius: 12px; overflow: hidden;">
        <div style="background: #121214; color: #fff; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px; color: #38bdf8;">🤝 Contacto por Mascota</h1>
          <p style="margin: 5px 0 0 0; font-size: 13px; color: #a1a1aa;">Un ciudadano respondió a la pregunta de seguridad para el reporte ${pet.id}</p>
        </div>

        <div style="padding: 20px;">
          <div style="background: #fff; border: 1px solid #e1e1e6; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #18181b;">Respuesta a la Pregunta Secreta:</h3>
            <p style="font-size: 13px; color: #334155; line-height: 1.5; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <strong>Pregunta:</strong> ${data.secretQuestion || 'N/A'}<br/>
              <strong>Respuesta del ciudadano:</strong> ${data.providedAnswer || 'N/A'}
            </p>

            <h3 style="margin: 15px 0 8px 0; font-size: 14px; color: #18181b;">Contacto del Ciudadano:</h3>
            <p style="font-size: 13px; color: #0284c7; font-weight: bold;">${data.userContact || 'No especificado'}</p>
          </div>
        </div>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
}

export async function sendEditRequestEmail(data: any) {
  return await sendCitizenRequestEmail("EDIT_REQUEST", data);
}

export async function sendInfoRequestEmail(data: any) {
  return await sendCitizenRequestEmail("INFO_REQUEST", data);
}

export async function sendCaseClosedEmail(pet: any, reason: string, details?: string) {
  const { user } = getEmailCredentials();
  const transporter = getTransporter();
  const recipientEmail = resolveRecipientEmail(pet);
  const isTest = recipientEmail === TEST_NOTIFICATION_EMAIL;

  const mailOptions = {
    from: `"Búsqueda Animal Cali${isTest ? ' [TEST]' : ''}" <${user}>`,
    to: recipientEmail,
    subject: `${isTest ? '🧪 [TEST] ' : ''}✅ [CASO REUNIDO/CERRADO ${pet.id}] ${pet.name} (${pet.species})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9fb; border: 1px solid #e1e1e6; border-radius: 12px; overflow: hidden;">
        <div style="background: #121214; color: #fff; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px; color: #10b981;">🎉 Caso Cerrado / Mascota Reunida</h1>
          <p style="margin: 5px 0 0 0; font-size: 13px; color: #a1a1aa;">El reporte ${pet.id} ha sido marcado como cerrado</p>
        </div>

        <div style="padding: 20px;">
          <div style="background: #fff; border: 1px solid #e1e1e6; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <p style="font-size: 14px; color: #18181b; margin: 0 0 8px 0;"><strong>Mascota:</strong> ${pet.name} (${pet.id})</p>
            <p style="font-size: 14px; color: #18181b; margin: 0 0 8px 0;"><strong>Motivo de Cierre:</strong> ${reason}</p>
            ${details ? `<p style="font-size: 13px; color: #71717a; margin: 0;"><strong>Detalles:</strong> ${details}</p>` : ''}
          </div>
        </div>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
}

export async function sendAdminNotificationEmail(subject: string, htmlContent: string, isTestForce?: boolean) {
  const { user } = getEmailCredentials();
  const transporter = getTransporter();
  const recipientEmail = resolveRecipientEmail(null, isTestForce);
  const isTest = recipientEmail === TEST_NOTIFICATION_EMAIL;

  const mailOptions = {
    from: `"Búsqueda Animal Cali${isTest ? ' [TEST]' : ''}" <${user}>`,
    to: recipientEmail,
    subject: `${isTest ? '🧪 [TEST] ' : ''}${subject}`,
    html: htmlContent,
  };

  return await transporter.sendMail(mailOptions);
}

export async function sendCitizenRequestEmail(type: "INFO_REQUEST" | "EDIT_REQUEST" | "CLOSE_REQUEST", data: any) {
  const { user } = getEmailCredentials();
  const transporter = getTransporter();
  const recipientEmail = resolveRecipientEmail(data?.pet);
  const isTest = recipientEmail === TEST_NOTIFICATION_EMAIL;

  const titles = {
    INFO_REQUEST: "👁️ Solicitud de Información Reservada (Contacto/Ubicación)",
    EDIT_REQUEST: "✏️ Sugerencia de Corrección Ciudadana para Reporte",
    CLOSE_REQUEST: "🔒 Solicitud Ciudadana para Cerrar Caso",
  };

  const pet = data?.pet || {};
  const mailOptions = {
    from: `"Búsqueda Animal Cali${isTest ? ' [TEST]' : ''}" <${user}>`,
    to: recipientEmail,
    subject: `${isTest ? '🧪 [TEST] ' : ''}[${titles[type] || 'SOLICITUD'}] Mascota ${pet.id || 'N/A'} (${pet.name || 'Sin nombre'})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9fb; border: 1px solid #e1e1e6; border-radius: 12px; overflow: hidden;">
        <div style="background: #121214; color: #fff; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 18px; color: #38bdf8;">${titles[type] || 'Solicitud Ciudadana'}</h1>
          <p style="margin: 5px 0 0 0; font-size: 13px; color: #a1a1aa;">Caso: ${pet.name || 'Mascota'} (ID: ${pet.id || 'N/A'})</p>
        </div>

        <div style="padding: 20px;">
          <div style="background: #fff; border: 1px solid #e1e1e6; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #18181b;">Mensaje / Motivo del Ciudadano:</h3>
            <p style="font-size: 13px; color: #334155; line-height: 1.5; white-space: pre-wrap; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">${data.requestReason || data.suggestedChanges || data.closeReason || 'Sin mensaje adicional'}</p>

            <h3 style="margin: 15px 0 8px 0; font-size: 14px; color: #18181b;">Contacto del Solicitante:</h3>
            <p style="font-size: 13px; color: #0284c7; font-weight: bold;">${data.requesterContact || 'No proporcionó contacto'}</p>
          </div>
        </div>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
}
