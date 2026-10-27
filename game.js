function initGame() {
    const canvas = document.getElementById('game');

    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    let player = {
        x: 85,
        y: 278,
        w: 36,
        h: 42,
        vy: 0,
        ground: true
    };

    let obstacles = [];
    let scroll = 0;
    let running = false;
    let finished = false;
    let raf = 0;

    const floor = 320;

    function build() {
        obstacles = [];

        let x = 360;

        for (let i = 0; i < 6 + gameState.currentLevel * 2; i++) {
            x += 115 + Math.random() * 85;

            obstacles.push({
                x,
                w: 24 + Math.random() * 18,
                h: 26 + Math.random() *
                    Math.min(44, 18 + gameState.currentLevel * 3)
            });
        }
    }

    function startLevel() {
        cancelAnimationFrame(raf);

        player = {
            x: 85,
            y: floor - 42,
            w: 36,
            h: 42,
            vy: 0,
            ground: true
        };

        scroll = 0;
        finished = false;
        running = true;

        build();

        const status = document.getElementById('gameStatus');

        if (status) {
            status.textContent = 'Ren maar!';
        }

        draw();

        raf = requestAnimationFrame(tick);
    }

    function move(d) {
        if (!running) {
            startLevel();
        }

        player.x = Math.max(
            15,
            Math.min(430, player.x + d * 24)
        );

        draw();
    }

    function jump() {
        if (!running) {
            startLevel();
        }

        if (player.ground) {
            player.vy = -14;
            player.ground = false;
        }
    }

    window.startLevel = startLevel;
    window.walk = move;
    window.doJump = jump;

    window.addEventListener('keydown', e => {
        if (!document.getElementById('levels')) return;

        if (
            ['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ']
                .includes(e.key)
        ) {
            e.preventDefault();
        }

        if (e.key === 'ArrowLeft') move(-1);
        if (e.key === 'ArrowRight') move(1);

        if (e.key === 'ArrowUp' || e.key === ' ') {
            jump();
        }
    });

    function tick() {
        if (!running) return;

        player.vy += 0.65;
        player.y += player.vy;

        if (player.y + player.h >= floor) {
            player.y = floor - player.h;
            player.vy = 0;
            player.ground = true;
        }

        scroll += 3 + gameState.currentLevel * 0.42;

        for (const o of obstacles) {
            const x = o.x - scroll + player.x - 85;

            if (
                x + o.w > player.x + 5 &&
                x < player.x + player.w - 5 &&
                player.y + player.h > floor - o.h + 5
            ) {
                running = false;

                const status = document.getElementById('gameStatus');

                if (status) {
                    status.textContent =
                        'Obstakel geraakt — probeer opnieuw!';
                }

                draw();
                return;
            }
        }

        if (scroll > obstacles[obstacles.length - 1].x + 420) {
            running = false;
            finished = true;

            const reward = 35 + gameState.currentLevel * 12;

            gameState.coins += reward;
            gameState.xp += 40;
            gameState.wins++;

            gameState.unlocked = Math.min(
                10,
                Math.max(
                    gameState.unlocked,
                    gameState.currentLevel + 1
                )
            );

            gameState.currentLevel = Math.min(
                10,
                gameState.currentLevel + 1
            );

            const status = document.getElementById('gameStatus');

            if (status) {
                status.textContent =
                    'Level gehaald! +' + reward +
                    ' kroontjes · +40 XP';
            }

            saveState();
            renderPage();

            notify(
                'Level gehaald! +' + reward +
                ' kroontjes en +40 XP'
            );

            draw();
            return;
        }

        draw();

        raf = requestAnimationFrame(tick);
    }

    function draw() {
        const w = canvas.width;
        const h = canvas.height;

        // Achtergrond
        const sky = ctx.createLinearGradient(0, 0, 0, h);

        sky.addColorStop(0, '#83d8fa');
        sky.addColorStop(1, '#e5ffd6');

        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);

        // Kleuren per wereld
        const palettes = [
            ['#b7e7c2', '#70cba2'],
            ['#b8d4ff', '#7aa7e8'],
            ['#ffc7a0', '#e98572'],
            ['#d8c7ff', '#a08de3'],
            ['#b2b9ff', '#737be0'],
            ['#d9f5ff', '#7db8d9'],
            ['#dbf1b2', '#8bbd6e'],
            ['#b7f2e9', '#4cb8c5'],
            ['#e3c5ff', '#a17bd9'],
            ['#ffe3a0', '#dca54e']
        ];

        const pal = palettes[gameState.currentLevel - 1];

        // Heuvels
        ctx.fillStyle = pal[0];

        for (let i = 0; i < 6; i++) {
            let x = (
                (i * 210 - scroll * 0.22) % 1150 + 1150
            ) % 1150 - 100;

            ctx.beginPath();

            ctx.arc(
                x,
                275,
                90 + (i % 3) * 15,
                Math.PI,
                0
            );

            ctx.fill();
        }

        // Grond
        ctx.fillStyle = pal[1];
        ctx.fillRect(0, floor, w, h - floor);

        // Kleine lijntjes op de grond
        ctx.fillStyle = '#ffffff55';

        for (let i = 0; i < 20; i++) {
            let x = (i * 60 - scroll * 0.6) % w;

            if (x < 0) x += w;

            ctx.fillRect(x, floor + 20, 18, 3);
        }

        // Obstakels
        for (const o of obstacles) {
            const x = o.x - scroll;

            if (x < -70 || x > w + 70) continue;

            ctx.fillStyle = '#fa5e80';

            ctx.beginPath();
            ctx.moveTo(x, floor);
            ctx.lineTo(x + o.w / 2, floor - o.h);
            ctx.lineTo(x + o.w, floor);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#ffffff65';

            ctx.fillRect(
                x + o.w * 0.35,
                floor - o.h + 9,
                4,
                8
            );
        }

        // Finishlijn
        const finish =
            (obstacles.at(-1)?.x || 1300) + 420 - scroll;

        ctx.fillStyle = '#ffd166';

        ctx.fillRect(finish, floor - 100, 9, 100);
        ctx.fillRect(finish + 45, floor - 100, 9, 100);
        ctx.fillRect(finish, floor - 100, 54, 9);

        ctx.fillStyle = '#fff';
        ctx.fillRect(finish + 8, floor - 91, 38, 24);

        ctx.fillStyle = '#192642';
        ctx.font = 'bold 12px system-ui';

        ctx.fillText('FINISH', finish + 10, floor - 75);

        // Speler
        ctx.font = '38px system-ui';

        ctx.fillText(
            localStorage.getItem('crownQuestShowcase') ||
            gameState.pets[0]?.emoji ||
            '🦊',
            player.x,
            player.y + player.h
        );

        // Level en kroontjes
        ctx.fillStyle = '#10203bcc';
        ctx.fillRect(14, 14, 190, 38);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 15px system-ui';

        ctx.fillText(
            'LEVEL ' + gameState.currentLevel +
            '  •  👑 ' + gameState.coins,
            26,
            38
        );

        // Startscherm
        if (!running && !finished) {
            ctx.fillStyle = '#12213ddd';
            ctx.fillRect(265, 115, 430, 90);

            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.font = 'bold 25px system-ui';

            ctx.fillText(
                'Klaar voor level ' +
                gameState.currentLevel + '?',
                480,
                153
            );

            ctx.font = '15px system-ui';

            ctx.fillText(
                'Klik op “Start / opnieuw” om te beginnen',
                480,
                180
            );

            ctx.textAlign = 'left';
        }

        // Gewonnen
        if (finished) {
            ctx.fillStyle = '#12213ddd';
            ctx.fillRect(330, 125, 300, 70);

            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.font = 'bold 24px system-ui';

            ctx.fillText('LEVEL GEHAALD! ✨', 480, 166);

            ctx.textAlign = 'left';
        }
    }

    build();
    draw();
}
