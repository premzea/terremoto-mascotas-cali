import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Búsqueda Animal Cali - Map Location Picker & GPS Pinpoint Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("1. Verifies rescue nudge tip banner and opens Map Location Picker modal", async ({ page }) => {
    // 1. Open Lost Pet Report modal
    const lostReportBtn = page.locator("button:has-text('Reportar Pérdida')");
    await expect(lostReportBtn).toBeVisible();
    await lostReportBtn.click();

    const modal = page.locator("div.fixed").first();
    await expect(modal.locator("h2:has-text('Reportar Mascota Perdida')")).toBeVisible();

    // 2. Upload image and advance to Step 2
    const fileInput = modal.locator("input[type='file']").first();
    const sampleImagePath = path.join(process.cwd(), "public", "photos", "B1.png");
    await fileInput.setInputFiles(sampleImagePath);

    const confirmCropBtn = page.getByRole("button", { name: "Confirmar Recorte" });
    if (await confirmCropBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await confirmCropBtn.click();
    }

    await expect(modal.locator("img[alt='Preview']")).toBeVisible({ timeout: 10000 });
    const nextBtn = modal.locator("button:has-text('Continuar')");
    await nextBtn.click();

    // 3. Verify Step 2 is active
    await expect(modal.locator("text=Paso 2 de 3")).toBeVisible();

    // 4. Verify Rescue Tip Banner is visible and explains map pinpointing
    const tipBanner = modal.locator("text=Recomendado para rescates más rápidos");
    await expect(tipBanner).toBeVisible();
    await expect(modal.locator("text=marcar el punto exacto en el mapa")).toBeVisible();

    // 5. Click the prominent '📍 Fijar en Mapa / GPS' button
    const mapPickerBtn = modal.locator("button:has-text('Fijar en Mapa / GPS')");
    await expect(mapPickerBtn).toBeVisible();
    await mapPickerBtn.click();

    // 6. Verify Map Location Picker modal is open
    const mapModal = page.locator("div.fixed.z-\\[70\\]");
    await expect(mapModal.locator("h3:has-text('Seleccionar Ubicación en Cali y Jamundí')")).toBeVisible();
    await expect(mapModal.locator("text=Toca la calle o parque exacto en el mapa")).toBeVisible();

    // 7. Search for a large neighborhood in Cali (e.g. Ciudad Jardín)
    const mapSearchInput = mapModal.locator("input[placeholder*='Escribe el barrio']");
    await mapSearchInput.fill("Ciudad Jardín");

    const searchSuggestion = mapModal.locator("button:has-text('Ciudad Jardín')").first();
    await expect(searchSuggestion).toBeVisible({ timeout: 5000 });
    await searchSuggestion.click();

    // 8. Verify the floating pill updates with the selected barrio
    await expect(mapModal.locator("strong:has-text('Ciudad Jardín')")).toBeVisible();

    // 9. Click 'Confirmar Ubicación'
    const confirmBtn = mapModal.locator("button:has-text('Confirmar Ubicación')");
    await confirmBtn.click();

    // 10. Verify coordinates and barrio are bound back into Step 2 of ReportModal
    await expect(modal.locator("strong:has-text('Ciudad Jardín')")).toBeVisible();
    await expect(modal.locator("span:has-text('Coordenadas:')")).toBeVisible();
  });

  test("2. Full report submission with exact GPS coordinates from map picker", async ({ page }) => {
    // 1. Open Found Pet Report modal
    const foundReportBtn = page.locator("button:has-text('Reportar Encontrada')");
    await expect(foundReportBtn).toBeVisible();
    await foundReportBtn.click();

    const modal = page.locator("div.fixed").first();

    // 2. Step 1: Upload photo
    const fileInput = modal.locator("input[type='file']").first();
    const sampleImagePath = path.join(process.cwd(), "public", "photos", "B1.png");
    await fileInput.setInputFiles(sampleImagePath);

    const confirmCropBtn = page.getByRole("button", { name: "Confirmar Recorte" });
    if (await confirmCropBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await confirmCropBtn.click();
    }
    await expect(modal.locator("img[alt='Preview']")).toBeVisible({ timeout: 10000 });
    await modal.locator("button:has-text('Continuar')").click();

    // 3. Step 2: Set Dog, Small Size
    await expect(modal.locator("text=Paso 2 de 3")).toBeVisible();
    await modal.getByRole("button", { name: "🐶 Perro", exact: true }).click();
    await modal.locator("select").nth(1).selectOption("PEQUEÑO");

    // 4. Open Map Picker
    await modal.locator("button:has-text('Fijar en Mapa / GPS')").click();
    const mapModal = page.locator("div.fixed.z-\\[70\\]");

    // Search and select 'El Ingenio'
    const mapSearchInput = mapModal.locator("input[placeholder*='Escribe el barrio']");
    await mapSearchInput.fill("El Ingenio");
    const ingenioSuggestion = mapModal.locator("button:has-text('El Ingenio')").first();
    await expect(ingenioSuggestion).toBeVisible({ timeout: 5000 });
    await ingenioSuggestion.click();

    // Click confirm
    await mapModal.locator("button:has-text('Confirmar Ubicación')").click();

    // 5. Advance to Step 3
    await modal.locator("button:has-text('Contacto Seguro')").click();

    // 6. Step 3: Fill contact
    await expect(modal.locator("text=Paso 3 de 3")).toBeVisible();
    await modal.locator("input[placeholder*='Ej: Familia Gómez']").fill("Test Map Rescuer");
    await modal.locator("input[type='tel']").fill("3150001234");

    // 7. Submit Report
    await modal.locator("button:has-text('Publicar y Buscar Coincidencias')").click();

    // 8. Close matching modal
    await expect(page.locator("h2:has-text('Motor de Coincidencias IA')")).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // 9. Verify card in feed
    const newCard = page.locator(".edge-card").first();
    await expect(newCard).toContainText("ENCONTRADO / RESCATADO");
    await expect(newCard).toContainText("R");

    // Clean up test record via API with isTest: true
    const cardId = await newCard.locator("span.font-mono").innerText().catch(() => "");
    if (cardId && /^[BR]\d+$/.test(cardId.trim())) {
      await page.request.post("/api/close-case", {
        data: { petId: cardId.trim(), passcode: "120905260506", isTest: true },
      });
    }
  });
});
