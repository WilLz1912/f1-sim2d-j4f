const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch().catch(async()=>chromium.launch());
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs=[]; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(require('url').pathToFileURL(require('path').resolve(process.env.SIM_HTML || __dirname + '/../../history/v11_old_geometry.html')).href);
  const track = process.argv[2] || 'barcelona';
  if (track !== 'barcelona') await p.evaluate(t => { const sel=document.getElementById('trackSelect'); sel.value=t; sel.dispatchEvent(new Event('change')); }, track);
  await p.waitForTimeout(15000);
  await p.screenshot({ path: `shots/old_${track}_full.png` });
  // zoom on the pit complex
  await p.evaluate(() => { const g = pitComplexGeom; state.zoom *= 4.5; state.panX = (g.workStart[0]+g.workEnd[0])/2; state.panY = (g.workStart[1]+g.workEnd[1])/2; state.camMode && (state.camMode = 'overview'); });
  await p.waitForTimeout(800);
  await p.screenshot({ path: `shots/old_${track}_pit.png` });
  const info = await p.evaluate(() => ({ session: state.session, prep: !!(QUALI && QUALI.prep), rc: state.raceControl, cars: cars.length }));
  console.log(track, JSON.stringify(info), 'errors:', errs.slice(0,3).join(' | '));
  await b.close();
})();
