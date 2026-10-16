const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch().catch(async()=>chromium.launch());
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs=[]; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(require('url').pathToFileURL(require('path').resolve(process.env.SIM_HTML || __dirname + '/../../v11/opus_argon_f1_2026_simulator_v11.html')).href);
  await p.waitForTimeout(12000);
  await p.evaluate(() => { skipToRace(); toggleCameraMode(); toggleCameraMode(); });
  await p.waitForTimeout(5000);
  await p.screenshot({ path: 'shots/smart_formation.png' });
  await p.evaluate(() => { state.speedMult = 10; });
  for (let i=0;i<60;i++){ await p.waitForTimeout(1000); const rc = await p.evaluate(()=>state.raceControl); if (rc==="START_LIGHTS") break; }
  await p.evaluate(() => { state.speedMult = 1; });
  await p.waitForTimeout(3500);
  await p.screenshot({ path: 'shots/smart_grid.png' }); console.log(await p.evaluate(()=>{const m=SMART.main; const W=innerWidth,H=innerHeight; const b=smartBaseZoom(W,H); const fr=smartFrame(m, smartView(W,H), b); return JSON.stringify({z:m.z, base:b, frz:fr.z, off:Math.hypot(m.offX,m.offY), shot:m.shot, key:m.shotKey, n:m.shotN, zmax:m.shotZMax, uz:SMART.userZoom, act:state.activeCamZoom});}));
  for (let i=0;i<20;i++){ await p.waitForTimeout(1000); const rc = await p.evaluate(()=>state.raceControl); if (rc==="GREEN") break; }
  await p.waitForTimeout(6000);
  await p.screenshot({ path: 'shots/smart_start.png' });
  console.log('errors:', errs.slice(0,3).join(' | '), await p.evaluate(()=>JSON.stringify({rc:state.raceControl, shot:SMART.main.shot, key:SMART.main.shotKey})));
  await b.close();
})();
