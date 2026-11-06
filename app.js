javascript
(() => {
  "use strict";

  const STORAGE_KEY = "crownQuestMultiPage_v1";

  const CHARACTERS = [
    { id: "knight", name: "Royal Knight", rarity: "Common", price: 0, emoji: "🛡️" },
    { id: "wizard", name: "Mystic Wizard", rarity: "Rare", price: 250, emoji: "🧙" },
    { id: "ninja", name: "Shadow Ninja", rarity: "Epic", price: 500, emoji: "🥷" },
    { id: "dragon", name: "Golden Dragon", rarity: "Legendary", price: 1000, emoji: "🐉" },
    { id: "king", name: "Crown King", rarity: "Mythic", price: 2000, emoji: "👑" }
  ];

  const SHOP_ITEMS = [
    { id: "small_crown_pack", name: "Small Crown Pack", description: "A small crown boost.", price: 100, reward: 100, emoji: "👑" },
    { id: "medium_crown_pack", name: "Medium Crown Pack", description: "A bigger crown boost.", price: 250, reward: 300, emoji: "💰" },
    { id: "royal_crate", name: "Royal Crate", description: "Open a crate for a random reward.", price: 150, crate: true, emoji: "🎁" },
    { id: "wizard", name: "Mystic Wizard", description: "Unlock a new character.", price: 250, character: "wizard", emoji: "🧙" },
    { id: "ninja", name: "Shadow Ninja", description: "Unlock a rare character.", price: 500, character: "ninja", emoji: "🥷" },
    { id: "dragon", name: "Golden Dragon", description: "Unlock a legendary character.", price: 1000, character: "dragon", emoji: "🐉" }
  ];

  const BATTLEPASS_REWARDS = [
    { level: 1, xp: 0, name: "100 Crowns", type: "coins", amount: 100, emoji: "👑" },
    { level: 2, xp: 100, name: "50 Crowns", type: "coins", amount: 50, emoji: "💰" },
    { level: 3, xp: 200, name: "Royal Crate", type: "crate", amount: 1, emoji: "🎁" },
    { level: 4, xp: 300, name: "100 Crowns", type: "coins", amount: 100, emoji: "👑" },
    { level: 5, xp: 400, name: "Mystic Wizard", type: "character", amount: "wizard", emoji: "🧙" },
    { level: 6, xp: 500, name: "200 Crowns", type: "coins", amount: 200, emoji: "💰" },
    { level: 7, xp: 650, name: "Royal Crate", type: "crate", amount: 1, emoji: "🎁" },
    { level: 8, xp: 800, name: "Shadow Ninja", type: "character", amount: "ninja", emoji: "🥷" },
    { level: 9, xp: 1000, name: "300 Crowns", type: "coins", amount: 300, emoji: "👑" },
    { level: 10, xp: 1250, name: "Golden Dragon", type: "character", amount: "dragon", emoji: "🐉" }
  ];

  const DEFAULT_STATE = {
    coins: 500,
    unlocked: 1,
    currentLevel: 1,
    xp: 0,
    wins: 0,
    claimed: [],
    pets: ["knight"],
    selectedCharacter: "knight",
    listings: [],
    completed: [],
    playerName: "Player",
    battlePassClaimed: [],
    inventory: [],
    crateHistory: []
  };

  let state = loadState();

  function loadState() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return normalizeState(stored);
    } catch (error) {
      console.warn("Could not load Crown Quest save:", error);
      return normalizeState({});
    }
  }

  function normalizeState(saved) {
    const result = { ...DEFAULT_STATE, ...saved };

    result.coins = Math.max(0, Number(result.coins) || 0);
    result.xp = Math.max(0, Number(result.xp) || 0);
    result.unlocked = Math.max(1, Math.min(210, Number(result.unlocked) || 1));
    result.currentLevel = Math.max(1, Math.min(210, Number(result.currentLevel) || 1));
    result.wins = Math.max(0, Number(result.wins) || 0);

    for (const key of [
      "claimed",
      "pets",
      "listings",
      "completed",
      "battlePassClaimed",
      "inventory",
      "crateHistory"
    ]) {
      if (!Array.isArray(result[key])) result[key] = [];
    }

    if (!result.pets.includes("knight")) result.pets.unshift("knight");

    if (!result.pets.includes(result.selectedCharacter)) {
      result.selectedCharacter = "knight";
    }

    return result;
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateWallet();
  }

  function notify(message) {
    let element = document.getElementById("cqNotification");

    if (!element) {
      element = document.createElement("div");
      element.id = "cqNotification";
      element.setAttribute("role", "status");

      Object.assign(element.style, {
        position: "fixed",
        bottom: "22px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: "9999",
        background: "#173c2b",
        color: "#ffe29a",
        padding: "13px 22px",
        border: "1px solid #d8b75c",
        borderRadius: "12px",
        boxShadow: "0 6px 24px #0005",
        fontWeight: "bold",
        textAlign: "center",
        maxWidth: "90vw"
      });

      document.body.appendChild(element);
    }

    element.textContent = message;
    element.style.display = "block";

    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => {
      element.style.display = "none";
    }, 2600);
  }

  function updateWallet() {
    document.querySelectorAll("[data-coins], #coinBalance, #coins").forEach(element => {
      element.textContent = state.coins.toLocaleString();
    });

    document.querySelectorAll("[data-xp], #xpBalance").forEach(element => {
      element.textContent = state.xp.toLocaleString();
    });

    document.querySelectorAll("[data-wins]").forEach(element => {
      element.textContent = state.wins.toLocaleString();
    });
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

  function completeLevel(levelNumber, collectedCoins = 0) {
    const level = Math.max(1, Math.min(210, Number(levelNumber) || 1));
    const bonus = Math.max(0, Number(collectedCoins) || 0);
    const firstCompletion = !state.completed.includes(level);

    if (firstCompletion) {
      state.completed.push(level);
      state.wins += 1;
      state.xp += 100;
      state.coins += 50 + bonus;
    } else {
      state.coins += bonus;
    }

    state.unlocked = Math.max(state.unlocked, Math.min(210, level + 1));
    state.currentLevel = Math.min(210, Math.max(state.currentLevel, level + 1));

    saveState();
    renderPage();

    notify(
      firstCompletion
        ? `Level ${level} complete! +${100} XP and +${50 + bonus} Crowns!`
        : `Replay complete! +${bonus} Crowns!`
    );
  }

  function buyItem(itemId) {
    const item = SHOP_ITEMS.find(entry => entry.id === itemId);
    if (!item) return notify("This item is unavailable.");

    if (item.character && state.pets.includes(item.character)) {
      return notify("You already own this character.");
    }

    if (state.coins < item.price) {
      return notify("Not enough Crowns!");
    }

    state.coins -= item.price;

    if (item.reward) {
      state.coins += item.reward;
      notify(`Purchase complete! You received ${item.reward} Crowns.`);
    } else if (item.character) {
      state.pets.push(item.character);
      notify(`${item.name} unlocked!`);
    } else if (item.crate) {
      const reward = openCrateReward(false);
      notify(`Crate opened! ${reward.name} (${reward.rarity}).`);
    }

    saveState();
    renderPage();
  }

  function getCrateReward() {
    const roll = Math.random() * 100;

    if (roll < 55) {
      return { rarity: "Common", name: "100 Crowns", type: "coins", amount: 100, emoji: "👑" };
    }

    if (roll < 82) {
      return { rarity: "Rare", name: "250 Crowns", type: "coins", amount: 250, emoji: "💰" };
    }

    if (roll < 95) {
      return { rarity: "Epic", name: "Mystic Wizard", type: "character", amount: "wizard", emoji: "🧙" };
    }

    if (roll < 99) {
      return { rarity: "Legendary", name: "Golden Dragon", type: "character", amount: "dragon", emoji: "🐉" };
    }

    return { rarity: "Mythic", name: "Crown King", type: "character", amount: "king", emoji: "👑" };
  }

  function openCrateReward(chargeCoins = true) {
    if (chargeCoins) {
      if (state.coins < 150) {
        notify("Not enough Crowns for a crate!");
        return null;
      }
      state.coins -= 150;
    }

    const reward = getCrateReward();

    if (reward.type === "coins") {
      state.coins += reward.amount;
    } else if (!state.pets.includes(reward.amount)) {
      state.pets.push(reward.amount);
    } else {
      state.coins += 150;
      reward.name = "Duplicate character compensation: 150 Crowns";
    }

    state.crateHistory.unshift({
      name: reward.name,
      rarity: reward.rarity,
      date: new Date().toISOString()
    });

    state.crateHistory = state.crateHistory.slice(0, 20);
    saveState();

    return reward;
  }

  function openCrate() {
    const result = openCrateReward(true);
    if (!result) return;

    const resultElement = document.getElementById("crateResult");

    if (resultElement) {
      resultElement.innerHTML = `
        <div class="crate-result">
          <div style="font-size:52px">${result.emoji}</div>
          <h2>${escapeHTML(result.name)}</h2>
          <p class="rarity-${result.rarity.toLowerCase()}">
            ${escapeHTML(result.rarity)} Reward
          </p>
        </div>
      `;
    }

    notify(`${result.rarity} reward: ${result.name}!`);
    renderPage();
  }

  function selectCharacter(characterId) {
    if (!state.pets.includes(characterId)) {
      return notify("You have not unlocked this character yet.");
    }

    state.selectedCharacter = characterId;
    saveState();
    renderPage();
    notify("Character selected!");
  }

  function claimBattlePass(level) {
    const reward = BATTLEPASS_REWARDS.find(item => item.level === Number(level));
    if (!reward) return;

    if (state.xp < reward.xp) {
      return notify("You need more XP to unlock this reward.");
    }

    if (state.battlePassClaimed.includes(reward.level)) {
      return notify("You already claimed this reward.");
    }

    if (reward.type === "coins") {
      state.coins += reward.amount;
    } else if (reward.type === "character") {
      if (!state.pets.includes(reward.amount)) {
        state.pets.push(reward.amount);
      } else {
        state.coins += 150;
      }
    } else if (reward.type === "crate") {
      const result = openCrateReward(false);
      if (result) notify(`Battle Pass crate: ${result.name}!`);
    }

    state.battlePassClaimed.push(reward.level);
    saveState();
    renderPage();
    notify(`${reward.name} claimed!`);
  }

  function createListing() {
    const nameInput = document.getElementById("listingName");
    const priceInput = document.getElementById("listingPrice");

    if (!nameInput || !priceInput) return;

    const name = nameInput.value.trim();
    const price = Math.floor(Number(priceInput.value));

    if (!name || !Number.isFinite(price) || price < 1) {
      return notify("Enter a valid item name and price.");
    }

    if (price > state.coins) {
      return notify("You cannot list an item for more Crowns than you own.");
    }

    state.listings.push({
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name,
      price,
      seller: state.playerName || "Player",
      created: new Date().toISOString()
    });

    saveState();
    renderPage();
    notify("Your listing has been created.");
  }

  function buyListing(id) {
    const listing = state.listings.find(item => item.id === id);
    if (!listing) return notify("This listing is no longer available.");

    if (listing.seller === state.playerName) {
      return notify("You cannot buy your own listing.");
    }

    if (state.coins < listing.price) {
      return notify("Not enough Crowns!");
    }

    state.coins -= listing.price;
    state.inventory.push({
      name: listing.name,
      boughtFor: listing.price,
      date: new Date().toISOString()
    });

    state.listings = state.listings.filter(item => item.id !== id);

    saveState();
    renderPage();
    notify(`${listing.name} purchased!`);
  }

  function renderLevels() {
    const map = document.getElementById("levelMap");
    if (!map) return;

    map.innerHTML = "";

    for (let world = 1; world <= 10; world++) {
      const heading = document.createElement("h2");
      heading.className = "world-heading";
      heading.textContent = `World ${world} — ${getWorldName(world)}`;
      map.appendChild(heading);

      const grid = document.createElement("div");
      grid.className = "level-grid";

      for (let localLevel = 1; localLevel <= 21; localLevel++) {
        const number = (world - 1) * 21 + localLevel;
        const unlocked = number <= state.unlocked;
        const completed = state.completed.includes(number);
        const boss = localLevel === 21;

        const tile = document.createElement("button");
        tile.type = "button";
        tile.className = `leveltile${boss ? " boss" : ""}${completed ? " completed" : ""}${unlocked ? "" : " locked"}`;
        tile.disabled = !unlocked;
        tile.textContent = boss ? "👹 BOSS" : String(number);
        tile.setAttribute("aria-label", `Level ${number}${boss ? ", boss level" : ""}`);

        if (unlocked) {
          tile.addEventListener("click", () => {
            state.currentLevel = number;
            saveState();
            notify(`Level ${number} selected. Press Start Level!`);
            const label = document.getElementById("levelLabel");
            if (label) label.textContent = `Level ${number}`;
          });
        }

        grid.appendChild(tile);
      }

      map.appendChild(grid);
    }
  }

  function getWorldName(world) {
    const names = [
      "Emerald Fields", "Desert Kingdom", "Frozen Peaks",
      "Magma Realm", "Sky Islands", "Mystic Forest",
      "Crystal Caves", "Storm Citadel", "Shadow Realm",
      "Crown Castle"
    ];

    return names[world - 1];
  }

  function renderShop() {
    const container = document.getElementById("shopItems");
    if (!container) return;

    container.innerHTML = "";

    SHOP_ITEMS.forEach(item => {
      const owned = item.character && state.pets.includes(item.character);
      const card = document.createElement("article");
      card.className = "shop-card";

      card.innerHTML = `
        <div class="shop-emoji">${item.emoji}</div>
        <h3>${escapeHTML(item.name)}</h3>
        <p>${escapeHTML(item.description)}</p>
        <strong>👑 ${item.price}</strong>
        <button type="button" ${owned ? "disabled" : ""}>
          ${owned ? "Owned" : "Buy"}
        </button>
      `;

      card.querySelector("button").addEventListener("click", () => buyItem(item.id));
      container.appendChild(card);
    });

    const roulette = document.getElementById("crateButton");
    if (roulette) roulette.onclick = openCrate;
  }

  function renderCollection() {
    const container = document.getElementById("collectionItems");
    if (!container) return;

    container.innerHTML = "";

    CHARACTERS.forEach(character => {
      const owned = state.pets.includes(character.id);
      const selected = state.selectedCharacter === character.id;

      const card = document.createElement("article");
      card.className = "collection-card";

      card.innerHTML = `
        <div class="character-emoji">${character.emoji}</div>
        <h3>${escapeHTML(character.name)}</h3>
        <p>${escapeHTML(character.rarity)}</p>
        <button type="button" ${!owned || selected ? "disabled" : ""}>
          ${selected ? "Selected" : owned ? "Select Character" : "Locked"}
        </button>
      `;

      card.querySelector("button").addEventListener("click", () => {
        selectCharacter(character.id);
      });

      container.appendChild(card);
    });
  }

  function renderBattlePass() {
    const container = document.getElementById("battlepassRewards");
    if (!container) return;

    container.innerHTML = "";

    BATTLEPASS_REWARDS.forEach(reward => {
      const claimed = state.battlePassClaimed.includes(reward.level);
      const unlocked = state.xp >= reward.xp;

      const card = document.createElement("article");
      card.className = "battlepass-card";

      card.innerHTML = `
        <div class="battlepass-emoji">${reward.emoji}</div>
        <h3>Tier ${reward.level}</h3>
        <p>${escapeHTML(reward.name)}</p>
        <small>${reward.xp} XP required</small>
        <button type="button" ${claimed || !unlocked ? "disabled" : ""}>
          ${claimed ? "Claimed" : unlocked ? "Claim Reward" : "Locked"}
        </button>
      `;

      card.querySelector("button").addEventListener("click", () => {
        claimBattlePass(reward.level);
      });

      container.appendChild(card);
    });

    const xpDisplay = document.getElementById("battlepassXP");
    if (xpDisplay) xpDisplay.textContent = state.xp.toLocaleString();
  }

  function renderMarket() {
    const container = document.getElementById("marketListings");
    if (!container) return;

    container.innerHTML = "";

    if (state.listings.length === 0) {
      container.textContent = "No listings available yet.";
      return;
    }

    state.listings.forEach(listing => {
      const card = document.createElement("article");
      card.className = "market-card";

      card.innerHTML = `
        <h3>${escapeHTML(listing.name)}</h3>
        <p>Seller: ${escapeHTML(listing.seller)}</p>
        <strong>👑 ${listing.price}</strong>
        <button type="button">Buy</button>
      `;

      card.querySelector("button").addEventListener("click", () => {
        buyListing(listing.id);
      });

      container.appendChild(card);
    });
  }

  function renderProfile() {
    document.querySelectorAll("[data-player-name]").forEach(element => {
      element.textContent = state.playerName;
    });

    document.querySelectorAll("[data-current-level]").forEach(element => {
      element.textContent = state.currentLevel;
    });

    document.querySelectorAll("[data-unlocked-level]").forEach(element => {
      element.textContent = state.unlocked;
    });

    document.querySelectorAll("[data-completed-levels]").forEach(element => {
      element.textContent = state.completed.length;
    });
  }

  function renderPage() {
    updateWallet();
    renderProfile();
    renderLevels();
    renderShop();
    renderCollection();
    renderBattlePass();
    renderMarket();
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  window.CrownQuest = {
    get state() {
      return { ...state, pets: [...state.pets], completed: [...state.completed] };
    },
    saveState,
    loadState,
    notify,
    buyItem,
    openCrate,
    selectCharacter,
    claimBattlePass,
    createListing,
    buyListing,
    renderPage,
    getWorldNumber,
    getLevelInWorld,
    isBossLevel
  };

  window.saveState = saveState;
  window.notify = notify;
  window.completeLevel = completeLevel;
  window.renderPage = renderPage;
  window.updateWallet = updateWallet;
  window.updateLeaderboard = renderProfile;
  window.openCrate = openCrate;
  window.selectCharacter = selectCharacter;
  window.claimBattlePass = claimBattlePass;
  window.createListing = createListing;
  window.buyListing = buyListing;

  document.addEventListener("DOMContentLoaded", renderPage);
})();
