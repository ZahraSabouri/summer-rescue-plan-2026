import fs from 'node:fs/promises'
import http from 'node:http'

const chromeBase = 'http://127.0.0.1:9222'
const appBase = 'http://127.0.0.1:5173'
const outDir = new URL('./screenshots/', import.meta.url)

function httpJson(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        body += chunk
      })
      res.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch (error) {
          reject(new Error(`Could not parse JSON from ${url}: ${error.message}\n${body}`))
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

async function newPage(path) {
  const target = await httpJson(`${chromeBase}/json/new?${encodeURIComponent(`${appBase}${path}`)}`, 'PUT')
  return target.webSocketDebuggerUrl
}

function makeCdp(wsUrl) {
  const ws = new WebSocket(wsUrl)
  let nextId = 1
  const pending = new Map()

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (!message.id) return
    const request = pending.get(message.id)
    if (!request) return
    pending.delete(message.id)
    if (message.error) request.reject(new Error(`${message.error.message}: ${message.error.data ?? ''}`))
    else request.resolve(message.result)
  })

  return {
    ready: new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true })
      ws.addEventListener('error', reject, { once: true })
    }),
    send(method, params = {}) {
      const id = nextId
      nextId += 1
      ws.send(JSON.stringify({ id, method, params }))
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject })
      })
    },
    close() {
      ws.close()
    },
  }
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function load(cdp, path, viewport) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile ?? false,
  })
  await cdp.send('Page.navigate', { url: `${appBase}${path}` })
  await wait(1800)
}

async function screenshot(cdp, name) {
  const result = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true })
  await fs.writeFile(new URL(name, outDir), Buffer.from(result.data, 'base64'))
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text)
  }
  return result.result.value
}

async function main() {
  await fs.mkdir(outDir, { recursive: true })
  const wsUrl = await newPage('/')
  const cdp = makeCdp(wsUrl)
  await cdp.ready
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')

  await load(cdp, '/', { width: 1440, height: 1000 })
  await evaluate(cdp, `localStorage.setItem('srp-skip-intro', '1')`)

  await load(cdp, '/#/board', { width: 1440, height: 1000 })
  await screenshot(cdp, 'desktop-board.png')
  const boardMetrics = await evaluate(
    cdp,
    `(() => {
      const columns = [...document.querySelectorAll('.board-column')].map((column) => {
        const rect = column.getBoundingClientRect()
        return {
          title: column.querySelector('h2')?.textContent ?? '',
          cards: column.querySelectorAll('.work-card').length,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        }
      })
      return {
        title: document.querySelector('.topbar-title h1')?.textContent ?? '',
        bodyWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        columns,
      }
    })()`,
  )

  await evaluate(cdp, `document.querySelector('.card-title-button')?.click()`)
  await wait(900)
  await screenshot(cdp, 'desktop-card-modal.png')
  const modalMetrics = await evaluate(
    cdp,
    `(() => {
      const box = (selector) => {
        const element = document.querySelector(selector)
        if (!element) return null
        const rect = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        return {
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          zIndex: style.zIndex,
          position: style.position,
        }
      }
      const sidebar = box('.app-sidebar')
      const shell = box('.card-detail-shell')
      const drawer = box('.detail-drawer')
      const center = document.elementsFromPoint(Math.floor(window.innerWidth / 2), Math.floor(window.innerHeight / 2))
        .slice(0, 6)
        .map((element) => element.className || element.tagName)
      const modalLeftStack = document.elementsFromPoint(Math.max(2, drawer?.left + 20 || 20), Math.floor(window.innerHeight / 2))
        .slice(0, 6)
        .map((element) => element.className || element.tagName)
      return {
        sidebar,
        shell,
        drawer,
        center,
        modalLeftStack,
        sidebarOverlapsDrawer: Boolean(sidebar && drawer && sidebar.right > drawer.left && sidebar.left < drawer.right),
      }
    })()`,
  )

  await load(cdp, '/#/board', { width: 390, height: 844, mobile: true })
  await screenshot(cdp, 'mobile-board.png')
  const mobileMetrics = await evaluate(
    cdp,
    `(() => ({
      bodyWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      title: document.querySelector('.topbar-title h1')?.textContent ?? '',
      filterVisible: Boolean(document.querySelector('.filter-bar')),
      columns: document.querySelectorAll('.board-column').length,
    }))()`,
  )

  await load(cdp, '/#/aml', { width: 1440, height: 1000 })
  await screenshot(cdp, 'desktop-module.png')
  const moduleMetrics = await evaluate(
    cdp,
    `(() => ({
      title: document.querySelector('.module-hero h1')?.textContent ?? document.querySelector('.topbar-title h1')?.textContent ?? '',
      resourceCards: document.querySelectorAll('.study-resource-card').length,
      moduleLayout: (() => {
        const el = document.querySelector('.module-layout')
        if (!el) return null
        const rect = el.getBoundingClientRect()
        return { width: Math.round(rect.width), height: Math.round(rect.height), columns: getComputedStyle(el).gridTemplateColumns }
      })(),
    }))()`,
  )

  const report = {
    capturedAt: new Date().toISOString(),
    boardMetrics,
    modalMetrics,
    mobileMetrics,
    moduleMetrics,
  }
  await fs.writeFile(new URL('ui-audit.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report, null, 2))
  cdp.close()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
