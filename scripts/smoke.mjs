import { chromium } from 'playwright-core';

const exe = '/opt/pw-browsers/chromium';
const base = 'http://localhost:4173';
const shots = process.argv[2] || '/tmp/shots';
import { mkdirSync } from 'node:fs';
mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 420, height: 860 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(base, { waitUntil: 'networkidle' });

// --- Today tab ---
await page.waitForSelector('text=Water', { timeout: 10000 });
const rotating = await page.locator('header p').first().textContent().catch(() => null);
console.log('Rotating line:', rotating);
// check a routine item
await page.click('text=Play the morning song');
// water +
await page.click('main >> text=Water >> xpath=ancestor::div[contains(@class,"card")] >> button:has-text("+")').catch(() => {});
const plus = page.locator('.card', { hasText: 'Water' }).locator('button', { hasText: '+' }).first();
await plus.click();
await plus.click();
// grace
await page.click('button:has-text("Partial grace")');
await page.screenshot({ path: shots + '/1-today.png', fullPage: true });

// --- People tab ---
await page.locator('nav').last().getByText('People').click();
await page.waitForSelector('text=Alessandra');
const names = await page.locator('main li .font-medium').allTextContents();
console.log('People count:', names.length, names.slice(0, 3));
// quick log
await page.click('text=+ Log connection');
await page.selectOption('select', { label: 'Eli' });
await page.click('button:has-text("hangout")');
await page.fill('textarea', 'Talked about the summer plan.');
await page.click('button:has-text("Save")');
await page.waitForTimeout(300);
await page.screenshot({ path: shots + '/2-people.png', fullPage: true });

// --- Textbook tab ---
await page.locator('nav').last().getByText('Textbook').click();
await page.waitForSelector('text=The Validities');
const entrenchedCount = await page.locator('text=entrenched').count();
console.log('Entrenched badges:', entrenchedCount);
await page.fill('input[placeholder="Search the Textbook…"]', 'grace');
await page.waitForTimeout(200);
const searchHits = await page.locator('.card p').count();
console.log('Search hits for "grace":', searchHits);
await page.fill('input[placeholder="Search the Textbook…"]', '');
// star an entry
await page.locator('button[title*="Star"]').first().click();
await page.screenshot({ path: shots + '/3-textbook.png', fullPage: false });

// --- Repair tab ---
await page.locator('nav').last().getByText('Repair').click();
await page.click('text=Something went sideways');
await page.fill('input[placeholder="What happened, plainly."]', 'Snapped at practice.');
await page.click('button:has-text("Next")');
await page.click('.card button:has-text("Yes")');
await page.fill('input[placeholder*="repair"]', 'Apologize to Isaiah tonight.');
await page.click('button:has-text("Next")');
await page.fill('input[placeholder*="condition"]', 'Skipped lunch. Eat before practice.');
await page.click('button:has-text("Next")');
await page.click('button:has-text("Debt settled. Resume.")');
await page.waitForSelector('text=No interest accrues');
await page.screenshot({ path: shots + '/4-repair.png', fullPage: true });

// --- Repair todo shows on Today ---
await page.locator('nav').last().getByText('Today').click();
await page.waitForSelector('text=Repair to make');
console.log('Repair todo surfaced on Today: yes');

// --- Review tab ---
await page.locator('nav').last().getByText('Review').click();
await page.waitForSelector('text=Focus ledger');
const cats = await page.locator('.card li').allTextContents();
console.log('Categories:', cats.length);
await page.screenshot({ path: shots + '/5-review.png', fullPage: true });

// --- Reload: persistence ---
await page.reload({ waitUntil: 'networkidle' });
await page.locator('nav').last().getByText('People').click();
await page.waitForSelector('text=Alessandra');
const eliRow = await page.locator('li', { hasText: 'Eli' }).first().textContent();
console.log('Eli row after reload:', eliRow?.trim().slice(0, 60));

console.log('Errors:', errors.length ? errors : 'none');
await browser.close();
process.exit(errors.length ? 1 : 0);
