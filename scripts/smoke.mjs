import { chromium } from 'playwright'

const shots = '/tmp/claude-0/-home-user-rally/d4b62bf2-3db4-59ef-b210-2b6a274d7266/scratchpad'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text())
})

await page.goto('file:///home/user/rally/dist/index.html')
await page.waitForTimeout(600)

// 1. seeded playbook renders
const cards = await page.locator('.play-card').count()
console.log('play cards:', cards)
const svgs = await page.locator('#play-svg').count()
console.log('editor svg:', svgs)
const routes = await page.locator('#play-svg polygon').count()
console.log('arrowheads on current play:', routes)
await page.screenshot({ path: shots + '/01-main.png' })

// 2. switch play
await page.locator('.play-card').nth(2).click()
await page.waitForTimeout(200)
await page.screenshot({ path: shots + '/02-power.png' })

// 3. new play + quick route flow
await page.getByRole('button', { name: '+ New Play' }).click()
await page.waitForTimeout(200)
// click the Z receiver (find player circle by label text)
const z = page.locator('#play-svg text', { hasText: 'Z' }).first()
await z.click({ force: true })
await page.waitForTimeout(150)
await page.getByRole('button', { name: 'Corner' }).click()
await page.waitForTimeout(150)
const routesAfter = await page.locator('#play-svg polygon').count()
console.log('routes after quick route:', routesAfter)

// 4. draw a manual route: select route tool, click X player, add points, dblclick
await page.keyboard.press('r')
const x = page.locator('#play-svg text', { hasText: 'X' }).first()
await x.click({ force: true })
const svgBox = await page.locator('#play-svg').boundingBox()
await page.mouse.click(svgBox.x + svgBox.width * 0.2, svgBox.y + svgBox.height * 0.45)
await page.mouse.dblclick(svgBox.x + svgBox.width * 0.3, svgBox.y + svgBox.height * 0.2)
await page.waitForTimeout(150)
const routesManual = await page.locator('#play-svg polygon').count()
console.log('routes after manual draw:', routesManual)
await page.screenshot({ path: shots + '/03-editing.png' })

// 5. drag QB
const qb = page.locator('#play-svg text', { hasText: 'QB' }).first()
await page.keyboard.press('v')
const qbBox = await qb.boundingBox()
await page.mouse.move(qbBox.x + qbBox.width / 2, qbBox.y + qbBox.height / 2)
await page.mouse.down()
await page.mouse.move(qbBox.x + 60, qbBox.y + 20, { steps: 5 })
await page.mouse.up()
console.log('drag done')

// 6. undo
await page.keyboard.press('Control+z')

// 7. flip
await page.getByRole('button', { name: '⇋ Flip' }).click()

// 8. print view
await page.getByRole('button', { name: 'Print / PDF' }).click()
await page.waitForTimeout(300)
const printCards = await page.locator('.print-card').count()
console.log('print cards:', printCards)
await page.screenshot({ path: shots + '/04-print.png' })
await page.getByRole('button', { name: 'Close' }).click()

// 9. persistence: reload and count plays
await page.reload()
await page.waitForTimeout(500)
const cardsAfterReload = await page.locator('.play-card').count()
console.log('cards after reload (persistence):', cardsAfterReload)

console.log('ERRORS:', errors.length ? errors : 'none')
await browser.close()
