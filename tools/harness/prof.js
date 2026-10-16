const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  await p.goto(require('url').pathToFileURL(require('path').resolve(process.env.SIM_HTML || __dirname + '/../../v11/opus_argon_f1_2026_simulator_v11.html')).href);
  await p.waitForTimeout(12000);
  await p.evaluate(() => { skipToRace(); state.speedMult = 4; });
  await p.waitForTimeout(30000);
  const res = {};
  for (const [name, setup] of [["map 1x", "state.speedMult=1; state.camMode='map'; document.body.classList.remove('tv-mode'); fitCameraToTrack();"], ["map 4x", "state.speedMult=4;"], ["smart 1x", "state.speedMult=1; toggleCameraMode(); toggleCameraMode();"], ["smart 4x", "state.speedMult=4;"]]) {
    await p.evaluate(setup);
    await p.waitForTimeout(1500);
    res[name] = await p.evaluate(() => new Promise(r => {
      const sp = stepPhysics, rd = render, hu = updateHUD; let tp = 0, tr = 0, th = 0, nf = 0;
      window.stepPhysics = function (d) { const t = performance.now(); sp(d); tp += performance.now() - t; };
      window.render = function () { const t = performance.now(); rd(); tr += performance.now() - t; nf++; };
      window.updateHUD = function () { const t = performance.now(); hu(); th += performance.now() - t; };
      const t0 = performance.now();
      setTimeout(() => { window.stepPhysics = sp; window.render = rd; window.updateHUD = hu; const T = (performance.now() - t0) / 1000;
        r({ fps: (nf / T).toFixed(1), physicsMsPerFrame: (tp / nf).toFixed(2), renderMsPerFrame: (tr / nf).toFixed(2), hudMsPerFrame: (th / nf).toFixed(2) }); }, 6000);
    }));
  }
  console.log(JSON.stringify(res, null, 1));
  await b.close();
})();
