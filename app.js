const DBKEY = 'crownQuestMultiPage_v1';

const defaultState = {
    coins: 500,
    unlocked: 1,
    currentLevel: 1,
    xp: 0,
    wins: 0,
    claimed: [],
    pets: [
        {
            id: 'starter-fox',
            name: 'Vosje',
            emoji: '🦊',
            rarity: 'common',
            desc: 'Je trouwe starter en eerste avonturier.'
        }
    ],
    listings: []
};

let gameState;

try {
    gameState = {
        ...defaultState,
        ...JSON.parse(localStorage.getItem(DBKEY) || '{}')
    };
} catch (e) {
    gameState = { ...defaultState };
}

if (!Array.isArray(gameState.pets) || !gameState.pets.length) {
    gameState.pets = [{ ...defaultState.pets[0] }];
}

if (!Array.isArray(gameState.listings)) gameState.listings = [];
if (!Array.isArray(gameState.claimed)) gameState.claimed = [];

const turtlePool = [
    {
        name: 'Rode Bandana Ninja',
        emoji: '🥷',
        rarity: 'legendary',
        weight: 4,
        desc: 'Een zeldzame ninjaheld met rode accenten.'
    },
    {
        name: 'Blauwe Bandana Ninja',
        emoji: '🐢',
        rarity: 'epic',
        weight: 10,
        desc: 'Een dappere schildpadheld met blauwe accenten.'
    },
    {
        name: 'Paarse Tech Ninja',
        emoji: '🤖',
        rarity: 'epic',
        weight: 16,
        desc: 'Een slimme techheld met paarse energie.'
    },
    {
        name: 'Oranje Street Ninja',
        emoji: '🍊',
        rarity: 'rare',
        weight: 25,
        desc: 'Een snelle streetheld met oranje flair.'
    },
    {
        name: 'Groene Turtle Rookie',
        emoji: '💚',
        rarity: 'common',
        weight: 45,
        desc: 'Een vrolijke groene nieuwkomer.'
    }
];

const miniPool = [
    {
        name: 'Sterrenkat',
        emoji: '🐱',
        rarity: 'common',
        weight: 55,
        desc: 'Een kleine kat met een grote droom.'
    },
    {
        name: 'Slijmgeest',
        emoji: '👻',
        rarity: 'rare',
        weight: 30,
        desc: 'Een wiebelige geestvriend.'
    },
    {
        name: 'Kristaluil',
        emoji: '🦉',
        rarity: 'epic',
        weight: 15,
        desc: 'Een wijze uil met glinsterende veren.'
    }
];

const worldData = [
    ['🌱', 'Groene heuvels'],
    ['💎', 'Kristalbos'],
    ['🌋', 'Lavakloof'],
    ['☁️', 'Wolkeneiland'],
    ['🌙', 'Maanvallei'],
    ['❄️', 'IJsbergen'],
    ['🍄', 'Paddenstoelenpad'],
    ['⚡', 'Bliksemberg'],
    ['🌌', 'Sterrenrijk'],
    ['👑', 'Kroonpaleis']
];

function saveState() {
    localStorage.setItem(DBKEY, JSON.stringify(gameState));
    updateSharedUI();
}

function notify(msg) {
    let el = document.getElementById('toast');

    if (!el) {
        el = document.createElement('div');
        el.id = 'toast';
        el.className = 'toast';
        document.body.appendChild(el);
    }

    el.textContent = msg;
    el.classList.add('show');

    clearTimeout(window.toastTimer);

    window.toastTimer = setTimeout(() => {
        el.classList.remove('show');
    }, 2500);
}

function escapeText(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
}

function pickWeighted(pool) {
    let n = Math.random() * pool.reduce((a, x) => a + x.weight, 0);

    for (const p of pool) {
        n -= p.weight;

        if (n < 0) return p;
    }

    return pool[pool.length - 1];
}

function addPet(p) {
    const pet = {
        ...p,
        id: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') +
            '-' + Date.now() +
            '-' + Math.floor(Math.random() * 9999)
    };

    delete pet.weight;

    gameState.pets.push(pet);

    return pet;
}

function buyCrate(type) {
    const cost = type === 'turtle' ? 150 : 75;

    if (gameState.coins < cost) {
        notify('Niet genoeg kroontjes!');
        return;
    }

    gameState.coins -= cost;

    const pet = addPet(
        pickWeighted(type === 'turtle' ? turtlePool : miniPool)
    );

    notify('Je kreeg ' + pet.name + ' (' + pet.rarity + ')!');

    saveState();
    renderPage();
}

function selectShowcase(id) {
    const p = gameState.pets.find(x => x.id === id);

    if (p) {
        localStorage.setItem('crownQuestShowcase', p.emoji);
        notify(p.name + ' geselecteerd!');
        updateSharedUI();
    }
}

function listPet() {
    const id = document.getElementById('sellPet')?.value;
    const price = Math.floor(
        Number(document.getElementById('sellPrice')?.value)
    );

    const pet = gameState.pets.find(p => p.id === id);

    if (!pet) {
        notify('Kies een poppetje.');
        return;
    }

    if (pet.id === 'starter-fox') {
        notify('Je starterpoppetje blijft bij je.');
        return;
    }

    if (!Number.isFinite(price) || price < 1 || price > 10000) {
        notify('Kies een prijs van 1 tot 10.000.');
        return;
    }

    gameState.pets = gameState.pets.filter(p => p.id !== id);

    gameState.listings.push({
        id: 'listing-' + Date.now(),
        pet,
        price
    });

    notify(pet.name + ' staat te koop op jouw lokale demo-markt.');

    saveState();
    renderPage();
}

function buyListing(id) {
    const l = gameState.listings.find(x => x.id === id);

    if (!l) return;

    if (gameState.coins < l.price) {
        notify('Niet genoeg kroontjes!');
        return;
    }

    gameState.coins -= l.price;

    gameState.pets.push({
        ...l.pet,
        id: l.pet.id + '-buy-' + Date.now()
    });

    gameState.listings = gameState.listings.filter(
        x => x.id !== id
    );

    notify('Je kocht ' + l.pet.name + '!');

    saveState();
    renderPage();
}

function updateSharedUI() {
    document.querySelectorAll('[data-coins]').forEach(e => {
        e.textContent = gameState.coins;
    });

    document.querySelectorAll('[data-pet-count]').forEach(e => {
        e.textContent = gameState.pets.length;
    });

    document.querySelectorAll('[data-unlocked]').forEach(e => {
        e.textContent = gameState.unlocked;
    });

    document.querySelectorAll('[data-showcase]').forEach(e => {
        e.textContent =
            localStorage.getItem('crownQuestShowcase') ||
            gameState.pets[0]?.emoji ||
            '🦊';
    });
}

function renderCollection() {
    const grid = document.getElementById('collectionGrid');

    if (!grid) return;

    const count = document.getElementById('petCount');

    if (count) {
        count.textContent =
            gameState.pets.length +
            ' poppetje' +
            (gameState.pets.length === 1 ? '' : 's');
    }

    grid.innerHTML = gameState.pets.map(p => `
        <article class="panel item">
            <div class="art">${p.emoji}</div>
            <span class="badge ${p.rarity}">${escapeText(p.rarity)}</span>
            <h3>${escapeText(p.name)}</h3>
            <p>${escapeText(p.desc || 'Een verzamelpoppetje.')}</p>
            <div class="item-foot">
                <span class="small">In collectie</span>
                <button class="secondary"
                    onclick="selectShowcase('${p.id}')">
                    Selecteer
                </button>
            </div>
        </article>
    `).join('');

    const sel = document.getElementById('sellPet');

    if (sel) {
        const old = sel.value;

        sel.innerHTML = gameState.pets.map(p => `
            <option value="${p.id}">
                ${escapeText(p.name)} ${p.emoji}
            </option>
        `).join('');

        if (gameState.pets.some(p => p.id === old)) {
            sel.value = old;
        }
    }
}

function renderMarket() {
    const rows = document.getElementById('marketRows');

    if (!rows) return;

    rows.innerHTML = gameState.listings.length
        ? gameState.listings.map(l => `
            <div class="row">
                <div class="rowicon">${l.pet.emoji}</div>

                <div class="rowinfo">
                    <b>${escapeText(l.pet.name)}</b>
                    <p>
                        <span class="badge ${l.pet.rarity}">
                            ${escapeText(l.pet.rarity)}
                        </span>
                        · Lokale demo-aanbieding
                    </p>
                </div>

                <b class="gold">👑 ${l.price}</b>

                <button onclick="buyListing('${l.id}')">
                    Kopen
                </button>
            </div>
        `).join('')
        : `
            <div class="empty">
                De markt is leeg. Zet een poppetje te koop
                om dit demo-systeem te testen.
            </div>
        `;
}

function claimReward(n) {
    if (
        gameState.claimed.includes(n) ||
        Math.floor(gameState.xp / 100) + 1 < n
    ) {
        return;
    }

    gameState.claimed.push(n);

    const rewards = {
        1: { coins: 25 },
        2: { pet: { name: 'Kikkermaatje', emoji: '🐸', rarity: 'common' } },
        3: { coins: 50 },
        4: { pet: { name: 'Kristaluil', emoji: '🦉', rarity: 'epic' } },
        5: { crate: 'mini' },
        6: { pet: { name: 'Mini-draak', emoji: '🐲', rarity: 'rare' } },
        7: { coins: 100 },
        8: { pet: { name: 'Sterren-eenhoorn', emoji: '🦄', rarity: 'epic' } },
        9: { crate: 'turtle' },
        10: { pet: { name: 'Kroonmeester', emoji: '👑', rarity: 'legendary' } }
    };

    const r = rewards[n];

    if (r.coins) {
        gameState.coins += r.coins;
    }

    if (r.pet) {
        addPet({
            ...r.pet,
            desc: 'Battlepassbeloning uit Crown Valley.'
        });
    }

    if (r.crate) {
        addPet(
            pickWeighted(r.crate === 'mini' ? miniPool : turtlePool)
        );
    }

    notify('Battlepassbeloning geclaimd!');

    saveState();
    renderPage();
}

function renderBattlepass() {
    const grid = document.getElementById('passGrid');

    if (!grid) return;

    const level = Math.min(10, Math.floor(gameState.xp / 100) + 1);
    const xp = gameState.xp % 100;

    document.getElementById('bpLevel').textContent = level;
    document.getElementById('bpXp').textContent = xp + ' / 100';
    document.getElementById('bpBar').style.width = xp + '%';

    const rewards = [
        ['🪙', '25 kroontjes'],
        ['🐸', 'Kikkermaatje'],
        ['🪙', '50 kroontjes'],
        ['🦉', 'Kristaluil'],
        ['📦', 'Mini crate'],
        ['🐲', 'Mini-draak'],
        ['🪙', '100 kroontjes'],
        ['🦄', 'Sterren-eenhoorn'],
        ['📦', 'Turtle crate'],
        ['👑', 'Kroonmeester']
    ];

    grid.innerHTML = rewards.map((r, i) => {
        const n = i + 1;
        const ready = level >= n;
        const claimed = gameState.claimed.includes(n);

        return `
            <article class="panel item">
                <div class="art">${r[0]}</div>
                <span class="badge ${n > 7 ? 'epic' : 'common'}">
                    Niveau ${n}
                </span>
                <h3>${r[1]}</h3>
                <p>
                    ${ready
                        ? 'Beloning beschikbaar.'
                        : 'Haal levels om XP te verdienen.'}
                </p>
                <button
                    ${!ready || claimed ? 'disabled' : ''}
                    onclick="claimReward(${n})">
                    ${claimed
                        ? 'Geclaimd'
                        : ready
                            ? 'Claim beloning'
                            : 'Vergrendeld'}
                </button>
            </article>
        `;
    }).join('');
}

function renderLevels() {
    const map = document.getElementById('levelMap');

    if (!map) return;

    map.innerHTML = worldData.map((w, i) => {
        const n = i + 1;
        const locked = n > gameState.unlocked;

        return `
            <div class="leveltile
                ${n === gameState.currentLevel ? 'current' : ''}
                ${locked ? 'locked' : ''}"
                ${locked ? '' : `onclick="selectLevel(${n})"`}>
                <b>${locked ? '🔒' : w[0]}</b>
                <span>Level ${n}</span>
            </div>
        `;
    }).join('');

    document.getElementById('levelLabel').textContent =
        'Level ' + gameState.currentLevel;

    document.getElementById('worldName').textContent =
        worldData[gameState.currentLevel - 1][0] +
        ' ' +
        worldData[gameState.currentLevel - 1][1];
}

function selectLevel(n) {
    if (n > gameState.unlocked) return;

    gameState.currentLevel = n;

    renderLevels();

    if (typeof startLevel === 'function') {
        startLevel();
    }
}

function renderPage() {
    updateSharedUI();
    renderCollection();
    renderMarket();
    renderBattlepass();
    renderLevels();
}

document.addEventListener('DOMContentLoaded', () => {
    renderPage();

    if (document.getElementById('game')) {
        initGame();
    }
});
