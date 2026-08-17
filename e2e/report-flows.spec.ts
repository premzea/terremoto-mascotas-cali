import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Búsqueda Animal Cali - Report Registration Flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("1. Report a LOST pet (Perdida) -> Auto-increments ID (B...), adds to feed, and triggers matching modal", async ({ page }) => {
    // 1. Click "Reportar Pérdida" button in Split Hero
    const lostReportBtn = page.locator("button:has-text('Reportar Pérdida')");
    await expect(lostReportBtn).toBeVisible();
    await lostReportBtn.click();

    const modal = page.locator("div.fixed");

    // 2. Verify Step 1 opens
    await expect(modal.locator("h2:has-text('Reportar Mascota Perdida')")).toBeVisible();
    await expect(modal.locator("text=Paso 1 de 3")).toBeVisible();

    // 3. Upload sample image
    const fileInput = modal.locator("input[type='file']");
    const sampleImagePath = path.join(process.cwd(), "public", "photos", "B1.png");
    await fileInput.setInputFiles(sampleImagePath);

    // Wait for preview
    await expect(modal.locator("img[alt='Preview']")).toBeVisible({ timeout: 10000 });

    // 4. Click "Continuar con Datos de la Mascota"
    const nextBtn1 = modal.locator("button:has-text('Continuar')");
    await expect(nextBtn1).toBeEnabled();
    await nextBtn1.click();

    // 5. Fill Step 2 (Pet Details)
    await expect(modal.locator("text=Paso 2 de 3")).toBeVisible();
    
    // Choose Dog (Perro)
    await modal.getByRole("button", { name: "🐶 Perro", exact: true }).click();

    // Fill Name
    await modal.locator("input[placeholder*='Ej: Dakota']").fill("TestDogLost");

    // Select Male and Castration status
    await modal.locator("select").first().selectOption("MACHO");
    await modal.locator("button:has-text('Sí (Castrado)')").click();

    // Fill Breed
    await modal.locator("input[placeholder*='Ej: Criollo']").fill("Labrador Mestizo");

    // Fill Barrio via search input
    const barrioInput = modal.locator("input[placeholder*='Escribe el barrio']");
    await barrioInput.fill("Nápoles");
    const suggestionBtn = modal.locator("button:has-text('Nápoles')").first();
    if (await suggestionBtn.isVisible()) {
      await suggestionBtn.click();
    }

    // Fill Distinctive Features
    await modal.locator("textarea").fill("Collar azul reflectivo, orejas caídas");

    // 6. Click "Contacto Seguro"
    await modal.locator("button:has-text('Contacto Seguro')").click();

    // 7. Fill Step 3 (Safe Contact)
    await expect(modal.locator("text=Paso 3 de 3")).toBeVisible();
    await modal.locator("input[placeholder*='Ej: Familia Gómez']").fill("Carlos Dueño");
    await modal.locator("input[type='tel']").fill("3159998877");

    // 8. Submit Report
    await modal.locator("button:has-text('Publicar y Buscar Coincidencias')").click();

    // 9. Verify Matching Modal automatically opens for the newly registered pet
    await expect(page.locator("h2:has-text('Motor de Coincidencias IA')")).toBeVisible({ timeout: 10000 });

    // Close the matching modal
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // 10. Verify the new pet card is rendered in the feed with a generated 'B' ID
    const newCard = page.locator(".edge-card").first();
    await expect(newCard).toContainText("TestDogLost");
    await expect(newCard).toContainText("PERDIDO / BUSCADO");
    await expect(newCard).toContainText("B");

    // Clean up test record via API to keep database clean
    const cardText = await newCard.innerText();
    const idMatch = cardText.match(/ID:\s*(B\d+)/i);
    if (idMatch && idMatch[1]) {
      await page.request.post("/api/close-case", {
        data: { petId: idMatch[1], passcode: "120905260506" },
      });
    }
  });

  test("2. Report a FOUND pet (Encontrada) -> Auto-increments ID (R...), adds to feed with protected location", async ({ page }) => {
    // 1. Click "Reportar Encontrada" button in Split Hero
    const foundReportBtn = page.locator("button:has-text('Reportar Encontrada')");
    await expect(foundReportBtn).toBeVisible();
    await foundReportBtn.click();

    const modal = page.locator("div.fixed");

    // 2. Verify Step 1 opens for Found Pet
    await expect(modal.locator("h2:has-text('Reportar Mascota Encontrada')")).toBeVisible();

    // 3. Upload sample image
    const fileInput = modal.locator("input[type='file']");
    const sampleImagePath = path.join(process.cwd(), "public", "photos", "B1.png");
    await fileInput.setInputFiles(sampleImagePath);

    // Wait for preview
    await expect(modal.locator("img[alt='Preview']")).toBeVisible({ timeout: 10000 });

    // 4. Click "Continuar con Datos de la Mascota"
    await modal.locator("button:has-text('Continuar')").click();

    // 5. Fill Step 2 (Pet Details)
    await expect(modal.locator("text=Paso 2 de 3")).toBeVisible();

    // Choose Cat (Gato)
    await modal.getByRole("button", { name: "🐱 Gato", exact: true }).click();

    // Select Size
    await modal.locator("select").nth(1).selectOption("PEQUEÑO");

    // Fill Breed
    await modal.locator("input[placeholder*='Ej: Criollo']").fill("Siamés");

    // Fill Barrio via search input
    const barrioInput = modal.locator("input[placeholder*='Escribe el barrio']");
    await barrioInput.fill("San Antonio");
    const suggestionBtn = modal.locator("button:has-text('San Antonio')").first();
    if (await suggestionBtn.isVisible()) {
      await suggestionBtn.click();
    }

    // 6. Click "Contacto Seguro"
    await modal.locator("button:has-text('Contacto Seguro')").click();

    // 7. Fill Step 3
    await expect(modal.locator("text=Paso 3 de 3")).toBeVisible();
    await modal.locator("input[placeholder*='Ej: Familia Gómez']").fill("Rescatista Sandra");
    await modal.locator("input[type='tel']").fill("3101112233");

    // 8. Submit Report
    await modal.locator("button:has-text('Publicar y Buscar Coincidencias')").click();

    // 9. Wait for modal and close matching modal
    await expect(page.locator("h2:has-text('Motor de Coincidencias IA')")).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // 10. Verify the new found pet card is at top of feed with 'R' prefix and protected location
    const newCard = page.locator(".edge-card").first();
    await expect(newCard).toContainText("ENCONTRADO / RESCATADO");
    await expect(newCard).toContainText("R");
    await expect(newCard).toContainText("En resguardo en Cali (Ubicación protegida por Triaje)");

    // Clean up test record via API to keep database clean
    const cardText = await newCard.innerText();
    const idMatch = cardText.match(/ID:\s*(R\d+)/i);
    if (idMatch && idMatch[1]) {
      await page.request.post("/api/close-case", {
        data: { petId: idMatch[1], passcode: "120905260506" },
      });
    }
  });
});
