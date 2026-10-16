const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(async()=>chromium.launch());
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs=[]; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file:///home/claude/argon_f1_2026_simulator_v11.html');
  await p.waitForTimeout(12000);
  await p.evaluate(() => { skipToRace(); });
  await p.waitForTimeout(25000);
  // scenario 1: local yellow at T10 with a stopped car; zoom there
  await p.evaluate(() => {
    const cfg = CIRCUITS[activeTrackKey]; const c = cars[cars.length-1];
    const s = 0.752, sp = getSplinePt(s);
    c.s = s; c.dLat = HALF_TRACK + 4; c.worldX = sp.x + sp.nx*c.dLat; c.worldY = sp.y + sp.ny*c.dLat; c.speedMps = 0;
    retireCar(c, "TEST stopped", { mobile: false, crash: true, impact: 10 });
    c.dnfState = "STOPPED";
    state.raceControl = "GREEN"; triggerLocalYellow(0.752, "test"); state.rcTimer = 1e9;
    state.running = false;
    const t = getSplinePt(0.74); state.camMode = "overview"; state.zoom *= 3.2; state.panX = t.x; state.panY = t.y;
  });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: 'shots/flag_yellow.png' });
  await p.evaluate(() => { fitCameraToTrack(); state.raceControl = "SC"; });
  await p.waitForTimeout(800);
  await p.screenshot({ path: 'shots/flag_sc.png' });
  await p.evaluate(() => { state.raceControl = "RED"; const t = getSplinePt(0.9); state.zoom *= 2.5; state.panX=t.x; state.panY=t.y; });
  await p.waitForTimeout(800);
  await p.screenshot({ path: 'shots/flag_red.png' });
  console.log('errors:', errs.slice(0,3).join(' | '));
  await b.close();
})();
