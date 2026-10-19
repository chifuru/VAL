"use strict";
const { app, BrowserWindow, session } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const entry = path.join(__dirname, "..", "Index.html");
const smoke = process.argv.includes("--smoke-test");
app
  .whenReady()
  .then(async () => {
    session.defaultSession.setPermissionRequestHandler(
      (_wc, _permission, callback) => callback(false),
    );
    // The app is entirely local. Block every network request, including accidental future additions.
    session.defaultSession.webRequest.onBeforeRequest(
      { urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"] },
      (_details, callback) => callback({ cancel: true }),
    );
    const win = new BrowserWindow({
      width: 1460,
      height: 1030,
      minWidth: 640,
      minHeight: 600,
      backgroundColor: "#101b1c",
      title: "LifeGame — 生態系観測室",
      autoHideMenuBar: true,
      show: !smoke,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.webContents.on("will-navigate", (event) => event.preventDefault());
    await win.loadFile(entry, smoke ? { query: { smoke: "1" } } : {});
    if (smoke) {
      let exit = 0;
      try {
        const result = await win.webContents.executeJavaScript(`(async () => {
        const t=window.__LIFE_TEST__; if(!t)throw Error('test bridge absent');
        if(typeof require!=='undefined')throw Error('Node exposed');
        await window.EcoArt.ready;if(!t.snapshot().assets.loaded)throw Error('Packaged artwork missing: '+t.snapshot().assets.errors.join(','));
        t.prepare({seed:'native-smoke',width:40,height:28,initial:80});
        if(t.snapshot().world.turn!==0)throw Error('prepare advanced');
        for(let i=0;i<10;i++)t.step();
        const manualTurn=t.snapshot().world.turn;
        document.getElementById('start').click();
        const workerStart=performance.now();
        while(t.snapshot().world.turn<=manualTurn && performance.now()-workerStart<15000)await new Promise(r=>setTimeout(r,50));
        const workerTurn=t.snapshot().world.turn;
        t.stop();
        document.getElementById('detail-view').click();
        const terrainStart=performance.now();
        while((!t.snapshot().render.terrainBuildMs||t.snapshot().render.terrainPending)&&performance.now()-terrainStart<20000)await new Promise(r=>setTimeout(r,100));
        if(!t.snapshot().render.terrainBuildMs||t.snapshot().render.terrainPending)throw Error('Local file terrain Worker did not finish');
        const s=t.snapshot();if(workerTurn<=manualTurn)throw Error('Local file Worker did not advance: '+document.getElementById('message').textContent);
        return {terrainWorker:true,terrainBuildMs:s.render.terrainBuildMs,workerPlayback:true,workerTurnMs:performance.now()-workerStart,assetsLoaded:t.snapshot().assets.loaded,assetErrors:t.snapshot().assets.errors,platform:navigator.platform,turn:s.world.turn,population:s.world.stats.population,nodeExposed:typeof require!=='undefined',local:location.protocol==='file:',title:document.title};
      })()`);
        if (!result.local) throw Error("Non-local renderer");
        const report = {
          ok: true,
          electron: process.versions.electron,
          platform: process.platform,
          arch: process.arch,
          ...result,
        };
        if (process.env.LIFEGAME_SMOKE_REPORT)
          await fs.writeFile(
            process.env.LIFEGAME_SMOKE_REPORT,
            JSON.stringify(report, null, 2) + "\n",
          );
        console.log(JSON.stringify(report));
      } catch (error) {
        exit = 1;
        console.error(error);
      }
      app.exit(exit);
    }
  })
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });
app.on("window-all-closed", () => app.quit());
