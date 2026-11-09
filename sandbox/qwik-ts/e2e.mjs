// Checks the generated Qwik JSX in a real browser, after SSR and resume, for each jsxStyleProps mode:
// `/` uses styled-system (all), `/minimal/` and `/none/` the matching outdirs.
//
//   pnpm e2e                                  # against the dev server (SSR)
//   pnpm qwik build preview && pnpm e2e preview
//
// Set CHROMIUM_PATH to use a browser other than the one playwright-core installs.
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const mode = process.argv[2] ?? 'dev'
const port = Number(process.env.E2E_PORT ?? 5310)
const origin = `http://localhost:${port}`
const viteArgs = mode === 'preview' ? ['preview'] : ['--mode', 'ssr']

const server = spawn('pnpm', ['exec', 'vite', ...viteArgs, '--port', String(port), '--strictPort'], {
  stdio: 'inherit',
  detached: true,
})
const stopServer = () => process.kill(-server.pid)

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(origin)).ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`${origin} did not start`)
}

async function expectAttributes(page, expected, attribute = 'class') {
  for (const [selector, value] of Object.entries(expected)) {
    const matched = page.waitForFunction(
      ([selector, attribute, value]) => document.querySelector(selector)?.getAttribute(attribute) === value,
      [selector, attribute, value],
      { timeout: 5000 },
    )
    await matched.catch(() => {})
    assert.equal(await page.locator(selector).getAttribute(attribute), value, `${selector} ${attribute}`)
  }
}

// Each page flips its variants on every click of #count, so step 0 and step 2 look the same.
const pages = {
  '/': (step) => {
    const size = step % 2 === 0 ? 'md' : 'lg'
    const tone = step % 2 === 0 ? 'info' : 'danger'
    return {
      '#count': `bg_blue.${step % 2 === 0 ? 500 : 700} c_white px_4 py_2`,
      '#card': `card__root card__root--size_${size}`,
      '#card h2': `card__title card__title--size_${size}`,
      '#card p:not(#bare)': `card__body card__body--size_${size}`,
      '#bare': 'bare',
      // the rest render in a component that only learns about the change from PropsProvider
      '#provided-card': `card__root card__root--size_${size}`,
      '#provided-card h2': `card__title card__title--size_${size}`,
      '#note': `card__body card__body--size_${size}`,
      '#glyph': `card__title card__title--size_${size}`,
      '#badge': `badge badge--tone_${tone}`,
      '#tag': `badge badge--tone_${tone}`,
    }
  },
  '/minimal/': (step) => {
    const size = step % 2 === 0 ? 'md' : 'lg'
    return {
      '#count': `bg_blue.${step % 2 === 0 ? 500 : 700}`,
      '#panel': 'p_4 mt_4',
      '#panel h2': `fw_bold fs_${size} c_red.500`,
      '#provided-panel': 'p_4 mt_2',
      '#provided-panel h2': `fw_bold fs_${size} c_red.500`,
    }
  },
  '/none/': (step) => {
    const size = step % 2 === 0 ? 'md' : 'lg'
    return {
      '#count': `bg_blue.${step % 2 === 0 ? 500 : 700}`,
      '#panel': 'p_4 panel',
      '#panel h2': `fw_bold fs_${size} title`,
      '#provided-panel': 'p_4 provided',
      '#provided-panel h2': `fw_bold fs_${size} title`,
    }
  },
}

let browser
try {
  await waitForServer()
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] })

  for (const [path, classes] of Object.entries(pages)) {
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))

    await page.goto(origin + path)
    for (let step = 0; step < 3; step++) {
      if (step > 0) {
        await page.click('#count')
        await page.locator('#count', { hasText: `Clicked ${step} times` }).waitFor({ timeout: 5000 })
      }
      await expectAttributes(page, classes(step))
    }
    assert.deepEqual(errors, [], path)

    if (path === '/') {
      // shouldForwardProp still applies when only PropsProvider changed
      await expectAttributes(page, { '#tag': 'tomato' }, 'color')
      assert.equal(await page.locator('#glyph [data-testid=glyph]').count(), 1)

      await page.click('#orphan')
      const missing = `Component "h2" (slot: "title") cannot access createSlotRecipeContext("card") because it's missing its Provider.`
      for (let i = 0; i < 20 && !errors.some((error) => error.includes(missing)); i++) await page.waitForTimeout(250)
      assert.ok(
        errors.some((error) => error.includes(missing)),
        `expected the missing provider error, got ${JSON.stringify(errors)}`,
      )
    }
    await page.close()
  }

  console.log(`e2e (${mode}): ok`)
} finally {
  await browser?.close()
  stopServer()
}
