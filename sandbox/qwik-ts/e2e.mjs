// Checks the generated Qwik JSX in a real browser, after SSR and resume.
//
//   pnpm e2e           # against the dev server (SSR)
//   pnpm build && pnpm e2e preview
//
// Set CHROMIUM_PATH to use a browser other than the one playwright-core installs.
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const mode = process.argv[2] ?? 'dev'
const port = Number(process.env.E2E_PORT ?? 5310)
const url = `http://localhost:${port}/`
const viteArgs = mode === 'preview' ? ['preview'] : ['--mode', 'ssr']

const server = spawn('pnpm', ['exec', 'vite', ...viteArgs, '--port', String(port), '--strictPort'], {
  stdio: 'inherit',
  detached: true,
})
const stopServer = () => process.kill(-server.pid)

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(url)).ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`${url} did not start`)
}

async function expectClasses(page, expected) {
  for (const [selector, className] of Object.entries(expected)) {
    const matched = page.waitForFunction(
      ([selector, className]) => document.querySelector(selector)?.getAttribute('class') === className,
      [selector, className],
      { timeout: 5000 },
    )
    await matched.catch(() => {})
    assert.equal(await page.locator(selector).getAttribute('class'), className, selector)
  }
}

const sized = (size) => ({
  '#card': `card__root card__root--size_${size}`,
  '#card h2': `card__title card__title--size_${size}`,
  '#card p:not(#bare)': `card__body card__body--size_${size}`,
  '#bare': 'bare',
  '#provided-card': `card__root card__root--size_${size}`,
  '#provided-card h2': `card__title card__title--size_${size}`,
})

let browser
try {
  await waitForServer()
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))

  await page.goto(url)
  await expectClasses(page, {
    ...sized('md'),
    '#count': 'bg_blue.500 c_white px_4 py_2',
    '#badge': 'badge badge--tone_info',
  })

  await page.click('#count')
  await page.locator('#count', { hasText: 'Clicked 1 times' }).waitFor({ timeout: 5000 })
  await expectClasses(page, {
    ...sized('lg'),
    '#count': 'bg_blue.700 c_white px_4 py_2',
    '#badge': 'badge badge--tone_danger',
  })

  await page.click('#count')
  await page.locator('#count', { hasText: 'Clicked 2 times' }).waitFor({ timeout: 5000 })
  await expectClasses(page, { ...sized('md'), '#badge': 'badge badge--tone_info' })
  assert.deepEqual(errors, [])

  await page.click('#orphan')
  const missing = `Component "h2" (slot: "title") cannot access createSlotRecipeContext("card") because it's missing its Provider.`
  for (let i = 0; i < 20 && !errors.some((error) => error.includes(missing)); i++) await page.waitForTimeout(250)
  assert.ok(
    errors.some((error) => error.includes(missing)),
    `expected the missing provider error, got ${JSON.stringify(errors)}`,
  )

  console.log(`e2e (${mode}): ok`)
} finally {
  await browser?.close()
  stopServer()
}
