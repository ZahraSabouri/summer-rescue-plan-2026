import { chromium } from 'playwright-core'

const url = 'http://127.0.0.1:5173/#/aml?tab=overview&card=card-001&resource=aml-session-1-s1-slides'

async function launch() {
  for (const channel of ['msedge', 'chrome', 'chromium']) {
    try {
      return await chromium.launch({ channel, headless: true })
    } catch {
      /* try next */
    }
  }
  throw new Error('no browser channel available')
}

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })

page.on('console', (msg) => console.log('[console]', msg.type(), msg.text()))
page.on('requestfailed', (req) => console.log('[requestfailed]', req.url(), req.failure()?.errorText))
page.on('response', (res) => {
  if (res.url().includes('study-assets')) {
    console.log('[response]', res.status(), res.url())
    try {
      console.log('[headers]', JSON.stringify(res.headers(), null, 2))
    } catch (e) {
      console.log('[headers error]', e.message)
    }
  }
})
page.on('frameattached', (frame) => console.log('[frame attached]', frame.url()))
page.on('framenavigated', (frame) => console.log('[frame navigated]', frame.url()))

await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 }).catch((e) => console.log('[goto error]', e.message))
await page.waitForTimeout(2500)

const iframeInfo = await page.evaluate(() => {
  const frames = Array.from(document.querySelectorAll('iframe'))
  return frames.map((f) => ({ src: f.src, className: f.className }))
})
console.log('[iframes in DOM]', JSON.stringify(iframeInfo, null, 2))

const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500))
console.log('[body text snippet]', bodyText)

await browser.close()
