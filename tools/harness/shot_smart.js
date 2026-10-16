const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch().catch(async()=>chromium.launch());
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs=[]; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(require('url').pathToFileURL(require('path').resolve(process.env.SIM_HTML || __dirname + '/../../v11/opus_argon_f1_2026_simulator_v11.html')).href);
  await p.waitForTimeout(12000);
  await p.evaluate(() => { skipToRace(); });
  await p.waitForTimeout(3000);
  await p.evaluate(() => { state.speedMult = 4; });
  await p.waitForTimeout(60000);   // get past lap 1
  await p.evaluate(() => { state.speedMult = 1; toggleCameraMode(); toggleCameraMode(); });
  // fps probe
  await p.evaluate(() => { window.__f=0; const f=()=>{window.__f++; requestAnimationFrame(f);}; requestAnimationFrame(f); });
  for (let k = 0; k < 4; k++) {
    await p.waitForTimeout(5000);
    await p.screenshot({ path: `shots/smart_${k}.png` });
  }
  const fps = await p.evaluate(() => window.__f / 24);
  const info = await p.evaluate(() => ({ mode: state.camMode, shot: SMART.main.shot, key: SMART.main.shotKey, pip: SMART.pipAlpha, label: SMART.main.label }));
  console.log('fps', fps.toFixed(1), JSON.stringify(info), 'errors:', errs.slice(0,3).join(' | '));
  await b.close();
})();
