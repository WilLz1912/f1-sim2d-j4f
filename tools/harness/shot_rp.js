const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch().catch(async()=>chromium.launch());
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs=[]; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(require('url').pathToFileURL(require('path').resolve(process.env.SIM_HTML || __dirname + '/../../v11/opus_argon_f1_2026_simulator_v11.html')).href);
  await p.waitForTimeout(12000);
  await p.evaluate(() => { skipToRace(); toggleCameraMode(); toggleCameraMode(); state.speedMult = 4; });
  for (let i=0;i<240;i++){ await p.waitForTimeout(1000); const r = await p.evaluate(()=>({lap:state.leaderLap, rp: !!SMART.rp})); if (r.rp && r.lap>=3) break; }
  await p.evaluate(() => { state.speedMult = 1; });
  await p.waitForTimeout(4000);
  await p.screenshot({ path: 'shots/rp_start.png' });
  await p.waitForTimeout(12000);
  await p.screenshot({ path: 'shots/rp_start2.png' });
  console.log('errors:', errs.slice(0,3).join(' | '), await p.evaluate(()=>JSON.stringify({lap:state.leaderLap, rp: SMART.rp && SMART.rp.label})));
  await b.close();
})();
