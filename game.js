```javascript
(() => {
  "use strict";

  const STORAGE_KEY = "crownQuestMultiPage_v1";

  const WORLDS = [
    { name: "Emerald Fields", sky: "#bce9c7", ground: "#438b55", accent: "#f2c94c" },
    { name: "Desert Kingdom", sky: "#f7d7a2", ground: "#c28a48", accent: "#ffe08a" },
    { name: "Frozen Peaks", sky: "#d8f3ff", ground: "#7aa9c2", accent: "#ffffff" },
    { name: "Magma Realm", sky: "#3b2637", ground: "#a84435", accent: "#ffb347" },
    { name: "Sky Islands", sky: "#b8d8ff", ground: "#6788bb", accent: "#fff0a6" },
    { name: "Mystic Forest", sky: "#b9d4bd", ground: "#41694d", accent: "#c9a7ff" },
    { name: "Crystal Caves", sky: "#c6c7ff", ground: "#615c9b", accent: "#72f1e8" },
    { name: "Storm Citadel", sky: "#a8b7c9", ground: "#4e5b70", accent: "#fff17a" },
    { name: "Shadow Realm", sky: "#77708f", ground: "#302c49", accent: "#d2a7ff" },
    { name: "Crown Castle", sky: "#ffe7a6", ground: "#8e7147", accent: "#fff4d0" }
  ];

  let canvas, ctx, statusEl, worldEl, levelLabel;
  let game;
  let keys = {};
  let keyboardBound = false;
  let animationFrame = null;
  let lastTime = 0;

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function getLevel() {
    const state = loadState();
    return Math.max(1, Math.min(210, Number(state.currentLevel) || 1));
  }

  function getWorldNumber(level) {
    return Math.min(10, Math.floor((level - 1) / 21) + 1);
  }

  function getLevelInWorld(level) {
    return ((level - 1) % 21) + 1;
  }

  function isBossLevel(level) {
    return getLevelInWorld(level) === 21;
  }

  function getWorld(level) {
    return WORLDS[getWorldNumber(level) - 1];
  }

  function status(message) {
    if (statusEl) statusEl.textContent = message;
  }

  function updateLabels() {
    if (!game) return;

    if (worldEl) {
      worldEl.textContent =
        `World ${getWorldNumber(game.level)}: ${getWorld(game.level).name}`;
    }

    if (levelLabel) {
      levelLabel.textContent =
        `Level ${game.level} · ${isBossLevel(game.level) ? "BOSS LEVEL" : `Level ${getLevelInWorld(game.level)} of 21`}`;
    }
  }

  function resizeCanvas() {
    if (!canvas || !ctx || !game) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    game.width = Math.max(320, rect.width || 960);
    game.height = Math.max(240, rect.height || 380);

    canvas.width = Math.floor(game.width * dpr);
    canvas.height = Math.floor(game.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    game.groundY = game.height - 54;

    if (game.player) {
      game.player.y = Math.min(
        game.player.y,
        game.groundY - game.player.h
      );
    }
  }

  function createLevel(level) {
    const obstacles = [];
    const coins = [];
    const bossLevel = isBossLevel(level);
    let x = game.width + 180;
    const count = bossLevel ? 5 : 9 + Math.floor(getLevelInWorld(level) / 4);

    for (let i = 0; i < count; i++) {
      x += 230 + Math.random() * 130;

      if (bossLevel && i === count - 1) {
        // Exactly one boss, with three lives.
        obstacles.push({
          kind: "boss",
          x,
          y: game.groundY - 104,
          w: 82,
          h: 104,
          hp: 3,
          maxHp: 3,
          hitCooldown: 0,
          defeated: false
        });
      } else {
        const roll = Math.random();
        const kind =
          roll < 0.4 ? "crate" :
          roll < 0.72 ? "spikes" : "drone";

        const h = kind === "crate" ? 38 : kind === "spikes" ? 28 : 32;

        obstacles.push({
          kind,
          x,
          y: kind === "drone"
            ? game.groundY - 90
            : game.groundY - h,
          w: kind === "spikes" ? 42 : kind === "drone" ? 48 : 38,
          h
        });
      }

      if (i % 2 === 0) {
        for (let c = 0; c < 3; c++) {
          coins.push({
            x: x - 105 + c * 30,
            y: game.groundY - 92 - Math.sin(c * Math.PI / 2) * 22,
            r: 9,
            taken: false
          });
        }
      }
    }

    return {
      obstacles,
      coins,
      finishX: x + 350,
      bossLevel
    };
  }

  function initGame() {
    canvas = document.getElementById("game");
    if (!canvas) return;

    ctx = canvas.getContext("2d");
    statusEl = document.getElementById("gameStatus");
    worldEl = document.getElementById("worldName");
    levelLabel = document.getElementById("levelLabel");

    game = {
      width: 960,
      height: 380,
      groundY: 326,
      level: getLevel(),
      running: false,
      over: false,
      completed: false,
      elapsed: 0,
      scroll: 0,
      runCoins: 0,
      dashTime: 0,
      slideTime: 0,
      player: null,
      data: null
    };

    resizeCanvas();

    if (!keyboardBound) {
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      window.addEventListener("resize", resizeCanvas);
      keyboardBound = true;
    }

    updateLabels();
    draw();
    status("Ready! Press Start Level to begin.");
  }

  function startLevel() {
    if (!game) initGame();
    if (!game) return;

    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    game.level = getLevel();
    game.running = true;
    game.over = false;
    game.completed = false;
    game.elapsed = 0;
    game.scroll = 0;
    game.runCoins = 0;
    game.dashTime = 0;
    game.slideTime = 0;

    game.player = {
      x: 95,
      y: game.groundY - 48,
      w: 34,
      h: 48,
      vy: 0,
      onGround: true,
      invulnerable: 0
    };

    game.data = createLevel(game.level);
    lastTime = performance.now();

    updateLabels();
    status(`Level ${game.level} started! Collect coins and reach the finish.`);
    animationFrame = requestAnimationFrame(loop);
  }

  function onKeyDown(event) {
    const key = event.key.toLowerCase();

    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
      event.preventDefault();
    }

    keys[key] = true;

    if (event.repeat) return;

    if (key === "arrowup" || key === " ") doJump();
    if (key === "arrowdown") doSlide();
    if (key === "shift" || key === "x") doDash();
    if (key === "arrowleft") walk(-1);
    if (key === "arrowright") walk(1);
  }

  function onKeyUp(event) {
    keys[event.key.toLowerCase()] = false;
  }

  function doJump() {
    if (!game?.running || !game.player) return;

    if (game.player.onGround && game.slideTime <= 0) {
      game.player.vy = -610;
      game.player.onGround = false;
    }
  }

  function doSlide() {
    if (!game?.running || !game.player) return;
    if (game.player.onGround) game.slideTime = 0.55;
  }

  function doDash() {
    if (!game?.running || !game.player) return;

    game.dashTime = 0.32;
    game.player.invulnerable = 0.38;

    const boss = game.data.obstacles.find(
      obstacle => obstacle.kind === "boss" && !obstacle.defeated
    );

    if (boss && overlaps(playerBox(), screenObstacle(boss)) && boss.hitCooldown <= 0) {
      hitBoss(boss);
    }
  }

  function walk(direction) {
    if (!game?.running) return;

    game.scroll = Math.max(0, game.scroll + direction * 24);
  }

  function playerBox() {
    const p = game.player;

    return {
      x: p.x,
      y: p.y + (game.slideTime > 0 ? 22 : 0),
      w: p.w + (game.dashTime > 0 ? 18 : 0),
      h: game.slideTime > 0 ? 26 : p.h
    };
  }

  function screenObstacle(obstacle) {
    return {
      x: obstacle.x - game.scroll,
      y: obstacle.y,
      w: obstacle.w,
      h: obstacle.h
    };
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y;
  }

  function hitBoss(boss) {
    if (boss.defeated || boss.hitCooldown > 0) return;

    boss.hp--;
    boss.hitCooldown = 0.8;

    if (boss.hp <= 0) {
      boss.hp = 0;
      boss.defeated = true;
      status("Boss defeated! Reach the finish to complete the level.");
    } else {
      status(`Boss hit! ${boss.hp} ${boss.hp === 1 ? "life" : "lives"} remaining.`);
    }
  }

  function loop(timestamp) {
    if (!game?.running) return;

    const dt = Math.min(0.035, Math.max(0, (timestamp - lastTime) / 1000));
    lastTime = timestamp;

    update(dt);
    draw();

    if (game.running) {
      animationFrame = requestAnimationFrame(loop);
    } else {
      animationFrame = null;
    }
  }

  function update(dt) {
    game.elapsed += dt;
    game.dashTime = Math.max(0, game.dashTime - dt);
    game.slideTime = Math.max(0, game.slideTime - dt);

    const p = game.player;
    p.invulnerable = Math.max(0, p.invulnerable - dt);

    if (keys.arrowright) game.scroll += 230 * dt;
    if (keys.arrowleft) game.scroll = Math.max(0, game.scroll - 230 * dt);

    p.vy += 1550 * dt;
    p.y += p.vy * dt;

    if (p.y + p.h >= game.groundY) {
      p.y = game.groundY - p.h;
      p.vy = 0;
      p.onGround = true;
    } else {
      p.onGround = false;
    }

    game.scroll += (game.dashTime > 0 ? 520 : 185) * dt;

    const player = playerBox();

    for (const coin of game.data.coins) {
      if (coin.taken) continue;

      const x = coin.x - game.scroll;
      const box = {
        x: x - coin.r,
        y: coin.y - coin.r,
        w: coin.r * 2,
        h: coin.r * 2
      };

      if (overlaps(player, box)) {
        coin.taken = true;
        game.runCoins += 5;
      }
    }

    for (const obstacle of game.data.obstacles) {
      if (obstacle.hitCooldown > 0) {
        obstacle.hitCooldown = Math.max(0, obstacle.hitCooldown - dt);
      }

      if (obstacle.defeated) continue;

      const box = screenObstacle(obstacle);

      if (box.x + box.w < -20 || box.x > game.width + 30) continue;
      if (!overlaps(player, box)) continue;

      if (obstacle.kind === "boss") {
        if (game.dashTime > 0 && obstacle.hitCooldown <= 0) {
          hitBoss(obstacle);
        } else if (p.invulnerable <= 0) {
          gameOver();
          return;
        }
      } else if (game.dashTime <= 0 && p.invulnerable <= 0) {
        gameOver();
        return;
      }
    }

    if (game.scroll >= game.data.finishX) {
      const bossAlive = game.data.obstacles.some(
        obstacle => obstacle.kind === "boss" && !obstacle.defeated
      );

      if (game.data.bossLevel && bossAlive) {
        game.scroll = game.data.finishX - 1;
        status("Defeat the boss before reaching the finish!");
      } else {
        completeRun();
      }
    }
  }

  function gameOver() {
    game.running = false;
    game.over = true;
    status("Game Over! Press Start Level to try again.");
    draw();
  }

  function completeRun() {
    if (game.completed) return;

    game.running = false;
    game.completed = true;

    const finishedLevel = game.level;
    const collectedCoins = game.runCoins;

    // Use the shared app.js reward function to avoid double rewards.
    if (typeof window.completeLevel === "function") {
      window.completeLevel(finishedLevel, collectedCoins);
    } else {
      const state = loadState();
      const completed = Array.isArray(state.completed) ? state.completed : [];
      const firstCompletion = !completed.includes(finishedLevel);

      if (firstCompletion) completed.push(finishedLevel);

      state.completed = completed;
      state.coins = Number(state.coins || 0) + collectedCoins + (firstCompletion ? 50 : 0);
      state.xp = Number(state.xp || 0) + (firstCompletion ? 100 : 0);
      state.unlocked = Math.max(
        Number(state.unlocked || 1),
        Math.min(210, finishedLevel + 1)
      );
      state.currentLevel = Math.max(
        Number(state.currentLevel || 1),
        Math.min(210, finishedLevel + 1)
      );

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    status(
      `Level complete! You collected ${collectedCoins} crowns. ` +
      (finishedLevel < 210 ? "Next level unlocked!" : "You conquered Crown Quest!")
    );

    updateLabels();
    draw();
  }

  function drawScene() {
    const world = getWorld(game.level);
    const w = game.width;
    const h = game.height;
    const groundY = game.groundY;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = world.sky;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#ffffff";

    for (let i = 0; i < 6; i++) {
      const x = ((i * 190 - game.scroll * 0.18) % (w + 130) + w + 130) % (w + 130) - 60;
      const y = 55 + (i % 3) * 34;

      ctx.beginPath();
      ctx.ellipse(x, y, 36, 13, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 27, y - 2, 25, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = world.ground;
    ctx.fillRect(0, groundY, w, h - groundY);

    ctx.fillStyle = world.accent;
    ctx.fillRect(0, groundY, w, 5);

    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#173c2b";

    for (let x = -(game.scroll * 0.7 % 42); x < w; x += 42) {
      ctx.fillRect(x, groundY + 18, 18, 4);
    }

    ctx.globalAlpha = 1;
  }

  function drawBoss(boss, x) {
    const bob = Math.sin(game.elapsed * 5) * 3;

    ctx.fillStyle = boss.hitCooldown > 0 ? "#f7c6c6" : "#70345f";
    ctx.fillRect(x, boss.y + bob, boss.w, boss.h);

    ctx.fillStyle = "#c64e64";
    ctx.fillRect(x + 7, boss.y + 14 + bob, boss.w - 14, 22);

    ctx.fillStyle = "#fff4cf";
    ctx.fillRect(x + 16, boss.y + 22 + bob, 10, 8);
    ctx.fillRect(x + boss.w - 26, boss.y + 22 + bob, 10, 8);

    ctx.fillStyle = "#e4c16e";
    ctx.beginPath();
    ctx.moveTo(x + 10, boss.y + bob);
    ctx.lineTo(x + 16, boss.y - 15 + bob);
    ctx.lineTo(x + 27, boss.y + bob);
    ctx.lineTo(x + 42, boss.y - 18 + bob);
    ctx.lineTo(x + 55, boss.y + bob);
    ctx.lineTo(x + 67, boss.y - 13 + bob);
    ctx.lineTo(x + 73, boss.y + bob);
    ctx.closePath();
    ctx.fill();

    const barW = 100;
    const barX = x + boss.w / 2 - barW / 2;
    const barY = boss.y - 31 + bob;

    ctx.fillStyle = "#3a1d2b";
    ctx.fillRect(barX, barY, barW, 10);

    ctx.fillStyle = "#e54b62";
    ctx.fillRect(
      barX + 1,
      barY + 1,
      (barW - 2) * (boss.hp / boss.maxHp),
      8
    );

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`BOSS ${boss.hp}/${boss.maxHp}`, x + boss.w / 2, barY - 5);
    ctx.textAlign = "left";
  }

  function drawPlayer() {
    const p = game.player;
    const sliding = game.slideTime > 0;
    const y = p.y + (sliding ? 19 : 0);
    const h = sliding ? 28 : p.h;

    if (p.invulnerable > 0 && Math.floor(game.elapsed * 18) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    ctx.fillStyle = "#174c37";
    ctx.fillRect(p.x, y, p.w, h);

    ctx.fillStyle = "#f4c7a1";
    ctx.fillRect(p.x + 7, y + 4, p.w - 14, Math.min(17, h - 5));

    ctx.fillStyle = "#2f5e9e";
    ctx.fillRect(p.x + 4, y + 22, p.w - 8, Math.max(5, h - 25));

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(p.x + 21, y + 9, 5, 5);

    ctx.fillStyle = "#1d2530";
    ctx.fillRect(p.x + 23, y + 10, 2, 3);

    ctx.globalAlpha = 1;

    if (game.dashTime > 0) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = "#f7d76b";
      ctx.fillRect(p.x - 22, y + 9, 17, 7);
      ctx.fillRect(p.x - 13, y + 21, 11, 5);
      ctx.globalAlpha = 1;
    }
  }

  function draw() {
    if (!ctx || !game) return;

    drawScene();

    if (game.data) {
      for (const coin of game.data.coins) {
        if (coin.taken) continue;

        const x = coin.x - game.scroll;
        if (x < -20 || x > game.width + 20) continue;

        ctx.fillStyle = "#ffd34f";
        ctx.beginPath();
        ctx.arc(x, coin.y, coin.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#b77b18";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      for (const obstacle of game.data.obstacles) {
        if (obstacle.defeated) continue;

        const x = obstacle.x - game.scroll;
        if (x + obstacle.w < -30 || x > game.width + 30) continue;

        if (obstacle.kind === "boss") {
          drawBoss(obstacle, x);
        } else if (obstacle.kind === "spikes") {
          ctx.fillStyle = "#6b2639";
          ctx.beginPath();
          ctx.moveTo(x, obstacle.y + obstacle.h);
          ctx.lineTo(x + obstacle.w / 2, obstacle.y);
          ctx.lineTo(x + obstacle.w, obstacle.y + obstacle.h);
          ctx.closePath();
          ctx.fill();
        } else if (obstacle.kind === "drone") {
          ctx.fillStyle = "#5b3e82";
          ctx.fillRect(x, obstacle.y, obstacle.w, obstacle.h);
          ctx.fillStyle = "#ff6b6b";
          ctx.fillRect(x + 8, obstacle.y + 10, 7, 5);
          ctx.fillRect(x + obstacle.w - 15, obstacle.y + 10, 7, 5);
        } else {
          ctx.fillStyle = "#8b5a35";
          ctx.fillRect(x, obstacle.y, obstacle.w, obstacle.h);
          ctx.strokeStyle = "#e3b16f";
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 4, obstacle.y + 4, obstacle.w - 8, obstacle.h - 8);
        }
      }

      const finishX = game.data.finishX - game.scroll;

      if (finishX > -20 && finishX < game.width + 60) {
        ctx.fillStyle = "#f8e7a1";
        ctx.fillRect(finishX, game.groundY - 105, 7, 105);

        ctx.fillStyle = "#2b6b45";
        ctx.beginPath();
        ctx.moveTo(finishX + 7, game.groundY - 103);
        ctx.lineTo(finishX + 58, game.groundY - 88);
        ctx.lineTo(finishX + 7, game.groundY - 72);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (game.player) drawPlayer();

    ctx.fillStyle = "rgba(16, 38, 29, 0.78)";
    ctx.fillRect(12, 12, 190, 52);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px system-ui";
    ctx.fillText(`Crowns collected: ${game.runCoins}`, 23, 34);

    ctx.font = "12px system-ui";
    ctx.fillText("↑ Jump · ↓ Slide · Shift Dash", 23, 52);

    if (!game.player && !game.running) {
      ctx.fillStyle = "#173c2b";
      ctx.font = "bold 25px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("CROWN QUEST", game.width / 2, game.height / 2 - 10);
      ctx.font = "16px system-ui";
      ctx.fillText("Press Start Level to play", game.width / 2, game.height / 2 + 20);
      ctx.textAlign = "left";
    }

    if (game.over || game.completed) {
      ctx.fillStyle = "rgba(11, 22, 18, 0.75)";
      ctx.fillRect(0, 0, game.width, game.height);

      ctx.textAlign = "center";
      ctx.fillStyle = "#ffe28a";
      ctx.font = "bold 34px system-ui";
      ctx.fillText(
        game.completed ? "LEVEL COMPLETE!" : "GAME OVER",
        game.width / 2,
        game.height / 2 - 15
      );

      ctx.fillStyle = "#ffffff";
      ctx.font = "17px system-ui";
      ctx.fillText(
        "Press Start Level to continue",
        game.width / 2,
        game.height / 2 + 20
      );

      ctx.textAlign = "left";
    }
  }

  window.initGame = initGame;
  window.startLevel = startLevel;
  window.doJump = doJump;
  window.doSlide = doSlide;
  window.doDash = doDash;
  window.walk = walk;
  window.getWorldNumber = getWorldNumber;
  window.getLevelInWorld = getLevelInWorld;
  window.isBossLevel = isBossLevel;

  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("game")) initGame();
  });
})();
