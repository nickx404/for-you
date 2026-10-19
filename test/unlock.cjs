// Exercise the real entrance before existing scene checks.
module.exports = async function unlock(page) {
  if (await page.locator('#passcode-gate').isVisible()) {
    await page.locator('#passcode-input').fill('1613');
    await page.locator('#passcode-input').press('Enter');
    await page.waitForSelector('#passcode-gate', { state: 'hidden' });
  }
};
