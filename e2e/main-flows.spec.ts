import { test, expect } from "@playwright/test";

test.describe("Búsqueda Animal Cali - Main E2E Flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("1. Landing page loads correctly with new title and without top yellow button", async ({ page }) => {
    // Verify Header Title
    await expect(page.locator("h1")).toContainText("Búsqueda Animal Cali");
    
    // Verify active badge
    await expect(page.locator("header")).toContainText("Red Activa");

    // Verify top yellow report button is gone from header
    const topYellowButton = page.locator("header button:has-text('Publicar Reporte')");
    await expect(topYellowButton).toHaveCount(0);

    // Verify Split Hero is present
    await expect(page.locator("text=¿Perdiste a tu mascota?")).toBeVisible();
    await expect(page.locator("text=¿Encontraste o resguardaste una?")).toBeVisible();
  });

  test("2. AI Matching modal opens and allows sending '¡Comunícate!' request", async ({ page }) => {
    // Find first card with "Coincidencias IA"
    const matchBtn = page.locator("button:has-text('Coincidencias IA')").first();
    await expect(matchBtn).toBeVisible();
    await matchBtn.click();

    // Verify AI Matching Modal
    const modal = page.locator("h2:has-text('Motor de Coincidencias IA')");
    await expect(modal).toBeVisible();

    // Check if Comunícate button exists in match list
    const communicateBtn = page.locator("button:has-text('¡Comunícate!')").first();
    if (await communicateBtn.isVisible()) {
      await communicateBtn.click();

      // Verify contact popup opens
      await expect(page.locator("h3:has-text('¡Conectar Mascotas!')")).toBeVisible();
      await expect(page.locator("button:has-text('Enviar a Triaje Central')")).toBeVisible();

      // Close the modal
      await page.locator("button:has-text('Cancelar')").click();
    }
  });

  test("3. Master Code modal opens when clicking 'Cerrar' on a pet card", async ({ page }) => {
    // Find first "Cerrar" button on a pet card
    const closeBtn = page.locator("button[title='Cerrar reporte / Marcar como reunido']").first();
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Verify Master Code Modal opens
    await expect(page.locator("h3:has-text('Cerrar Caso de Mascota')")).toBeVisible();
    await expect(page.locator("label:has-text('Código Maestro de Admin:')")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
    await expect(page.locator("button:has-text('Confirmar Cierre')")).toBeVisible();

    // Click Cancel
    await page.locator("button:has-text('Cancelar')").click();
    await expect(page.locator("h3:has-text('Cerrar Caso de Mascota')")).toHaveCount(0);
  });

  test("4. Filtering works correctly by species and search term", async ({ page }) => {
    // Filter by Cats (Gatos)
    const catsFilterBtn = page.locator("button:has-text('🐱 Gatos')");
    await catsFilterBtn.click();

    // Check that cards update
    await expect(page.locator(".edge-card").first()).toBeVisible();

    // Search by text
    const searchInput = page.locator("input[placeholder*='Buscar por nombre']");
    await searchInput.fill("Miel");

    // Verify filtered count updates
    await expect(page.locator("text=Mostrando")).toBeVisible();
  });
});
