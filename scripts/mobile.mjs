import { chromium, devices } from 'playwright'
const shots = '/tmp/claude-0/-home-user-rally/d4b62bf2-3db4-59ef-b210-2b6a274d7266/scratchpad'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })

async function check(name, opts, file) {
  const ctx = await browser.newContext(opts)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => m.type() === 'error' && !m.text().includes('TUNNEL') && errors.push(m.text()))
  await page.goto('file:///home/user/rally/dist/index.html')
  await page.waitForTimeout(800)

  const bar = await page.locator('.mobile-bar').count()
  // nothing may overflow the viewport horizontally
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  const fieldBox = await page.locator('#play-svg').boundingBox()
  console.log(`\n== ${name} ==`)
  console.log(`bottom bar: ${bar} | horizontal overflow: ${overflow}px ${overflow > 1 ? '*** OVERFLOWS ***' : 'OK'} | field ${Math.round(fieldBox.width)}x${Math.round(fieldBox.height)}`)

  if (bar) {
    // Plays drawer
    await page.getByRole('button', { name: 'Plays' }).click()
    await page.waitForTimeout(350)
    console.log('plays drawer visible:', await page.locator('.sidebar').isVisible(), '| cards:', await page.locator('.play-card').count())
    await page.screenshot({ path: `${shots}/${file}-plays.png` })
    // picking a play closes it
    await page.locator('.play-card').first().click()
    await page.waitForTimeout(350)
    const drawerOpen = await page.locator('.panel-host.panel-left.open').count()
    console.log('drawer closes after picking a play:', drawerOpen === 0)

    // Setup sheet
    await page.getByRole('button', { name: 'Setup' }).click()
    await page.waitForTimeout(300)
    console.log('setup sheet has formation + hash + spot:',
      await page.locator('.sheet-body select').count(), 'selects,',
      await page.locator('.sheet-body .hash-seg').count(), 'hash control')
    await page.screenshot({ path: `${shots}/${file}-setup.png` })
    await page.locator('.sheet-scrim').click()
    await page.waitForTimeout(300)

    // tapping a player should raise the inspector on its own
    const z = page.locator('#play-svg text', { hasText: /^Z$/ }).first()
    await z.click({ force: true })
    await page.waitForTimeout(400)
    console.log('inspector auto-opens on tap:', await page.locator('.panel-host.panel-bottom.open').count() === 1)
    const quick = await page.locator('.inspector .quick-btn').first()
    console.log('quick routes reachable:', await quick.isVisible())
    await page.screenshot({ path: `${shots}/${file}-edit.png` })
    await quick.click()
    await page.waitForTimeout(300)
    console.log('route assigned from the sheet:', await page.locator('#play-svg polygon').count() > 0)

    // More sheet
    await page.getByRole('button', { name: 'More' }).click()
    await page.waitForTimeout(300)
    console.log('more sheet actions:', (await page.locator('.sheet-body .btn').allTextContents()).join(' '))
    await page.locator('.sheet-scrim').click()
    await page.waitForTimeout(250)

    // Coach
    await page.getByRole('button', { name: 'Coach' }).click()
    await page.waitForTimeout(350)
    const cb = await page.locator('.coach-panel').boundingBox()
    console.log('coach panel width vs viewport:', Math.round(cb.width), 'of', page.viewportSize().width)
    await page.screenshot({ path: `${shots}/${file}-coach.png` })
  }
  // touch target audit
  const small = await page.evaluate(() => {
    const out = []
    for (const el of document.querySelectorAll('button, select, input')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      if (r.height < 30) out.push((el.textContent || el.className || el.tagName).trim().slice(0, 24) + ` ${Math.round(r.height)}px`)
    }
    return [...new Set(out)]
  })
  console.log('controls under 30px tall:', small.length ? small.join(', ') : 'none')
  console.log('errors:', errors.length ? errors.join(' | ') : 'none')
  await ctx.close()
}

await check('iPhone 14 (390x844)', { ...devices['iPhone 14'] }, 'm-phone')
await check('iPad (820x1180)', { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true }, 'm-ipad')
await check('Desktop (1440x900)', { viewport: { width: 1440, height: 900 } }, 'm-desktop')
await browser.close()
