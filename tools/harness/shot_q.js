const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs=[]; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file:///home/claude/argon_f1_2026_simulator_v11.html');
  await p.waitForTimeout(12000);
  await p.evaluate(() => { state.speedMult = 20; });
  await p.waitForTimeout(+process.argv[2] || 25000);
  await p.evaluate(() => { const c = cars.find(x => x.qMode === "PUSH") || cars[0]; selectCar(c.idx); state.speedMult = 1; });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: 'shots/quali_sectors.png' });
  const info = await p.evaluate(() => ({ t: state.raceTime, sess: state.session, best: state.secBest, spd: state.spdBest }));
  console.log(JSON.stringify(info), 'errors:', errs.slice(0,3).join(' | '));
  await b.close();
})();
