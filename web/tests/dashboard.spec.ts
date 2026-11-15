import { test, expect } from "@playwright/test"

test("observa a API, executa carga e navega sem dados fictícios", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", error => errors.push(error.message))
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Mission control." })).toBeVisible()
  await expect(page.getByText("API operacional", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Executar teste", exact: true }).click()
  await expect(page.getByText("Teste concluído. Confira as respostas abaixo.")).toBeVisible()
  await expect(page.getByRole("cell", { name: "/api/work", exact: true })).toHaveCount(6)
  const download = page.waitForEvent("download")
  await page.getByRole("button", { name: "Exportar" }).click()
  expect((await download).suggestedFilename()).toBe("devops-lab-samples.json")
  await page.getByRole("tab", { name: "Entrega contínua" }).click()
  await expect(page.getByText("Uma entrega, quatro etapas.")).toBeVisible()
  await page.getByRole("tab", { name: "Playbook" }).click()
  await expect(page.getByText("04 / Encerrar", { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(errors).toEqual([])
  await page.getByRole("tab", { name: "Visão geral" }).click()
  await page.screenshot({ path: `../work/dashboard-${test.info().project.name}.png`, fullPage: true })
})
