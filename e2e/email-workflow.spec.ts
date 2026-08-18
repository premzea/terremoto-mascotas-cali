import { test, expect } from "@playwright/test";
import nodemailer from "nodemailer";

test.describe("Búsqueda Animal Cali - Email Notification Workflow", () => {
  test("1. Verify Gmail SMTP credentials and routing to test inbox (busquedaanimalcali.pruebas@gmail.com)", async () => {
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

    // Verify SMTP connection handshake with Google
    const isReady = await transporter.verify();
    expect(isReady).toBe(true);

    // Verify sending a test notification to the dedicated testing address
    const testInfo = await transporter.sendMail({
      from: '"Búsqueda Animal Cali [TEST]" <busquedanimalcali@gmail.com>',
      to: "busquedaanimalcali.pruebas@gmail.com",
      subject: "🧪 [E2E TEST] Handshake y Verificación de Casilla de Pruebas",
      text: "Verificación automatizada de flujo de correos a la casilla de pruebas.",
    });
    expect(testInfo.messageId).toBeDefined();
  });

  test("2. /api/notify endpoint handles NEW_REPORT with Base64 photo CID conversion", async ({ request }) => {
    const fakeBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const res = await request.post("/api/notify", {
      data: {
        type: "NEW_REPORT",
        data: {
          pet: {
            id: "TEST_EMAIL_01",
            name: "Mascota Test Correo",
            report_type: "FOUND",
            species: "CAT",
            gender: "HEMBRA",
            primary_color: "Blanco y Negro",
            size: "PEQUEÑO",
            neighborhood: "San Fernando",
            contact_name: "Usuario Automatizado",
            contact_phone: "3100000000",
            photo_url: fakeBase64,
          },
        },
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("3. /api/notify endpoint handles MATCH_CONTACT AI notification", async ({ request }) => {
    const res = await request.post("/api/notify", {
      data: {
        type: "MATCH_CONTACT",
        data: {
          targetPet: {
            id: "TEST_T1",
            name: "Pelusa",
            report_type: "LOST",
            species: "CAT",
            neighborhood: "Granada",
          },
          candidatePet: {
            id: "TEST_C1",
            name: "Mishi Rescatado",
            report_type: "FOUND",
            species: "CAT",
            neighborhood: "Versalles",
          },
          score: 92,
          reasons: ["Misma especie (Gato)", "Mismo pelaje blanco y negro", "Zonas cercanas (Granada / Versalles)"],
          userMessage: "Creo que esta es mi gatita perdida, por favor contáctenme.",
        },
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("4. Full registration workflow in /api/create-pet creates record and dispatches email", async ({ request }) => {
    // 1. Create pet via API
    const createRes = await request.post("/api/create-pet", {
      data: {
        report_type: "LOST",
        species: "DOG",
        name: "Test E2E Email Dog",
        gender: "MACHO",
        primary_color: "Dorado",
        size: "MEDIANO",
        neighborhood: "San Antonio",
        contact_name: "Test Automatizado",
        contact_phone: "3150009999",
        photo_url: "/placeholder-pet.png",
      },
    });

    expect(createRes.status()).toBe(201);
    const createData = await createRes.json();
    expect(createData.success).toBe(true);
    expect(createData.pet).toBeDefined();
    expect(createData.pet.id).toMatch(/^B\d+$/);

    const createdPetId = createData.pet.id;

    // 2. Clean up test record from Supabase immediately using Master Code
    const closeRes = await request.post("/api/close-case", {
      data: {
        petId: createdPetId,
        passcode: "120905260506",
      },
    });

    expect(closeRes.status()).toBe(200);
    const closeData = await closeRes.json();
    expect(closeData.success).toBe(true);
  });
});
