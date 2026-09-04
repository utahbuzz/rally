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

// 9. field position: end zone appears, goal to go, nothing past the back line
const spot = page.locator('.spot-select')
await spot.selectOption('7')
await page.waitForTimeout(250)
console.log('end zone band at the +7:', await page.locator('#play-svg rect[fill="#eeeaff"]').count())
console.log('first-down marker at the +7 (goal to go, expect 0):', await page.locator('#play-svg line[stroke="#f59e0b"]').count())
console.log('thumbnails follow the play:', await page.locator('.thumb rect[fill="#eeeaff"]').count())
await spot.selectOption('98')
await page.waitForTimeout(250)
console.log('own end zone backed up on the 2:', await page.locator('#play-svg rect[fill="#eeeaff"]').count())
await spot.selectOption('')
await page.waitForTimeout(250)
console.log('end zone cleared in the open field:', (await page.locator('#play-svg rect[fill="#eeeaff"]').count()) === 0)

// 10. display settings: fills, labels, shapes
await page.getByRole('button', { name: 'Display' }).click()
await page.waitForTimeout(150)
await page.getByRole('button', { name: 'By group', exact: true }).click()
await page.waitForTimeout(200)
const groupFills = await page.locator('#play-svg circle').evaluateAll((els) =>
  [...new Set(els.map((e) => e.getAttribute('fill')))].filter((f) => f && f !== 'transparent'),
)
console.log('group fills on the field:', groupFills.join(' '))
await page.getByRole('button', { name: 'Number', exact: true }).click()
await page.waitForTimeout(200)
const nums = await page.locator('#play-svg text').allTextContents()
console.log('number labels:', nums.slice(0, 11).join(','))
await page.getByRole('button', { name: 'Position', exact: true }).click()
await page.getByRole('button', { name: 'White', exact: true }).click()
await page.keyboard.press('Escape')
await page.waitForTimeout(200)

// 11. per-player marker colour
await page.locator('#play-svg text', { hasText: /^QB$/ }).first().click({ force: true })
await page.waitForTimeout(200)
await page.locator('.inspector .swatch-row').first().locator('button').nth(6).click()
await page.waitForTimeout(200)
console.log('per-player violet marker:', await page.locator('#play-svg circle[fill="#7c3aed"]').count())
await page.keyboard.press('Escape')

// 12. playbook organization: groups, star, search
console.log('formation groups:', (await page.locator('.group-head').allTextContents()).length)
await page.getByRole('button', { name: 'Tag', exact: true }).click()
await page.waitForTimeout(200)
console.log('tag groups:', (await page.locator('.group-head').allTextContents()).length)
const beforeCollapse = await page.locator('.play-card').count()
await page.locator('.group-head').first().click()
await page.waitForTimeout(150)
console.log('collapse works:', (await page.locator('.play-card').count()) < beforeCollapse)
await page.locator('.group-head').first().click()
await page.getByRole('button', { name: 'Formation', exact: true }).click()
await page.locator('.play-card').first().hover()
await page.locator('.play-card .star').first().click()
await page.waitForTimeout(200)
await page.locator('.star-tag').click()
await page.waitForTimeout(200)
console.log('starred filter shows:', await page.locator('.play-card').count())
await page.locator('.star-tag').click()
await page.locator('.search').fill('flood')
await page.waitForTimeout(200)
console.log('search flattens groups:', (await page.locator('.group-head').count()) === 0)
await page.locator('.search').fill('')
await page.waitForTimeout(200)

// 13. read progression + notes on the diagram
await page.locator('.play-card').first().click()
await page.waitForTimeout(250)
await page.locator('#play-svg polygon').first().click({ force: true })
await page.waitForTimeout(200)
await page.locator('.read-seg').getByRole('button', { name: '1', exact: true }).click()
await page.waitForTimeout(200)
console.log('read badge drawn:', await page.locator('#play-svg circle[stroke="#fff"]').count())
await page.keyboard.press('Escape')
await page.getByRole('button', { name: 'Note' }).click()
const fieldBox = await page.locator('#play-svg').boundingBox()
await page.mouse.click(fieldBox.x + fieldBox.width * 0.28, fieldBox.y + fieldBox.height * 0.3)
await page.waitForTimeout(250)
await page.locator('.inspector textarea').fill('vs 2-high: work the seam')
await page.waitForTimeout(250)
console.log('note drawn:', await page.locator('#play-svg text[paint-order="stroke"]').count())
await page.keyboard.press('Escape')
await page.getByRole('button', { name: 'Print / PDF' }).click()
await page.waitForTimeout(350)
console.log('progression on the print card:', await page.locator('.print-card-read').first().textContent())
await page.getByRole('button', { name: 'Close' }).click()
await page.waitForTimeout(200)

// 14. persistence: reload and count plays
await page.reload()
await page.waitForTimeout(500)
const cardsAfterReload = await page.locator('.play-card').count()
console.log('cards after reload (persistence):', cardsAfterReload)
console.log(
  'reads/notes/stars survive a reload:',
  await page.locator('#play-svg circle[stroke="#fff"]').count(),
  await page.locator('#play-svg text[paint-order="stroke"]').count(),
  await page.locator('.star-tag').count(),
)

console.log('ERRORS:', errors.length ? errors : 'none')
await browser.close()
