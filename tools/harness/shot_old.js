const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(async()=>chromium.launch());
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs=[]; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file:///tmp/claude-0/-home-claude/4862c905-e09c-5f6a-a94d-868da8dbcada/scratchpad/backup_before_pitside.html');
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
