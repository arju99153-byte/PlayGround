(() => {
  const SAVE_KEY = 'little-acre-save-v1';
  const seasons = [
    { name: 'Spring', icon: '🌱', crops: ['carrot', 'berry'], line: 'A new season begins', sky: 'spring' },
    { name: 'Summer', icon: '☀️', crops: ['carrot', 'turnip'], line: 'Long, golden days ahead', sky: 'summer' },
    { name: 'Autumn', icon: '🍂', crops: ['pumpkin', 'berry'], line: 'The air turns crisp & cozy', sky: 'autumn' },
    { name: 'Winter', icon: '❄️', crops: ['turnip', 'pumpkin'], line: 'A quiet season to tend', sky: 'winter' }
  ];
  const crops = {
    carrot: { name: 'Carrot', icon: '🥕', seed: '🌱', days: 3, cost: 6, value: 9, colors: ['🌿', '🥕'] },
    berry: { name: 'Berry', icon: '🍓', seed: '🌱', days: 4, cost: 8, value: 14, colors: ['🌿', '🍃'] },
    turnip: { name: 'Turnip', icon: '🥬', seed: '🌱', days: 2, cost: 5, value: 8, colors: ['🌿', '🥬'] },
    pumpkin: { name: 'Pumpkin', icon: '🎃', seed: '🌱', days: 4, cost: 9, value: 17, colors: ['🌿', '🍃'] }
  };
  const weatherTypes = [
    { name: 'Sunny', icon: '☀️', note: 'A lovely day to grow', rain: false },
    { name: 'Breezy', icon: '🌤️', note: 'The garden feels fresh', rain: false },
    { name: 'Rainy', icon: '🌧️', note: 'Rain will water your beds', rain: true },
    { name: 'Cloudy', icon: '☁️', note: 'A soft, quiet kind of day', rain: false }
  ];
  const initialState = () => ({ day: 1, coins: 24, harvests: 0, streak: 0, bestStreak: 0, seeds: { carrot: 4, berry: 2, turnip: 2, pumpkin: 1 }, plots: Array.from({ length: 9 }, () => null), tool: 'plant', seed: 'carrot', weather: 0, lastMessage: '' });
  let state;
  try { state = { ...initialState(), ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') }; }
  catch { state = initialState(); }
  if (!Array.isArray(state.plots) || state.plots.length !== 9) state.plots = initialState().plots;
  state.plots = state.plots.map(plot => plot && typeof plot === 'object' && crops[plot.crop] ? { watered: false, growth: 0, ...plot } : null);
  state.seeds = { ...initialState().seeds, ...(state.seeds || {}) };
  state.seed = crops[state.seed] ? state.seed : 'carrot';
  state.tool = ['plant', 'water', 'harvest', 'clear'].includes(state.tool) ? state.tool : 'plant';
  let soundOn = false;
  let toastTimer;
  const $ = (id) => document.getElementById(id);
  const grid = $('farmGrid');

  function seasonIndex() { return Math.floor((state.day - 1) / 7) % seasons.length; }
  function dayInSeason() { return ((state.day - 1) % 7) + 1; }
  function season() { return seasons[seasonIndex()]; }
  function save() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    $('saveStatus').textContent = 'Garden saved just now';
  }
  function showToast(message) {
    const el = $('toast'); el.textContent = message; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }
  function render() {
    const currentSeason = season();
    $('seasonIcon').textContent = currentSeason.icon;
    $('seasonName').textContent = currentSeason.name;
    $('dayLabel').textContent = `Day ${dayInSeason()}`;
    $('dateEyebrow').textContent = currentSeason.line;
    $('coinCount').textContent = state.coins;
    const weather = weatherTypes[state.weather] || weatherTypes[0];
    $('weatherIcon').textContent = weather.icon;
    $('weatherName').textContent = weather.name;
    $('weatherNote').textContent = weather.note;
    $('harvestCount').textContent = state.harvests;
    $('streakCount').textContent = state.bestStreak;
    $('gardenScene').dataset.season = currentSeason.sky;
    $('gardenScene').className = `garden-scene season-${currentSeason.sky}`;
    const watered = state.plots.filter(plot => plot && (plot.watered || weather.rain)).length;
    $('waterSummary').textContent = `${watered} / 9 watered`;
    $('seedToolNote').textContent = `${crops[state.seed].name} · ${state.seeds[state.seed]} seeds`;
    document.querySelectorAll('.tool-button').forEach(button => button.classList.toggle('active', button.dataset.tool === state.tool));
    $('seedPicker').hidden = state.tool !== 'plant';
    renderSeedChoices();
    renderPlots();
    $('journalMessage').textContent = state.lastMessage || getJournalLine();
  }
  function renderPlots() {
    grid.innerHTML = '';
    state.plots.forEach((plot, index) => {
      const button = document.createElement('button');
      button.className = 'plot'; button.type = 'button'; button.dataset.index = index;
      const description = plot ? `${crops[plot.crop].name}, ${plot.growth >= crops[plot.crop].days ? 'ready to harvest' : `growing, ${plot.growth} of ${crops[plot.crop].days} days`}` : 'empty garden bed';
      button.setAttribute('aria-label', `Bed ${index + 1}: ${description}`);
      if (!plot) {
        button.classList.add('plot-empty');
        button.innerHTML = `<span class="plot-sprite">🪴</span><span class="plot-label">EMPTY BED</span>`;
      } else {
        const crop = crops[plot.crop];
        const ready = plot.growth >= crop.days;
        const stage = Math.min(crop.colors.length - 1, Math.max(0, Math.floor((plot.growth / crop.days) * crop.colors.length)));
        const sprite = plot.growth === 0 ? crop.seed : plot.growth >= crop.days ? crop.icon : crop.colors[stage];
        button.classList.toggle('plot-watered', plot.watered || weatherTypes[state.weather].rain);
        button.classList.toggle('plot-ready', ready);
        button.innerHTML = `<span class="plot-water-mark">${plot.watered || weatherTypes[state.weather].rain ? '💧' : ''}</span><span class="plot-sprite ${plot.growth === 0 ? 'plot-seed' : ''}">${sprite}</span><span class="plot-badge ${ready ? 'ready' : ''}">${ready ? '✦' : `${plot.growth}/${crop.days}`}</span><span class="plot-label">${ready ? 'READY!' : crop.name.toUpperCase()}</span>`;
      }
      button.addEventListener('click', () => handlePlot(index));
      grid.appendChild(button);
    });
  }
  function renderSeedChoices() {
    const container = $('seedOptions'); container.innerHTML = '';
    season().crops.forEach(key => {
      const crop = crops[key]; const count = state.seeds[key] || 0;
      const button = document.createElement('button');
      button.type = 'button'; button.className = `seed-option ${state.seed === key ? 'active' : ''}`;
      button.innerHTML = `<span class="seed-emoji">${crop.icon}</span><span><strong>${crop.name}</strong><small>${count > 0 ? `${count} seeds` : `Buy 3 · ${crop.cost}✦`}</small></span>`;
      button.addEventListener('click', () => {
        if (count < 1) {
          if (state.coins < crop.cost) { showToast(`You need ${crop.cost} ✦ for ${crop.name.toLowerCase()} seeds.`); return; }
          state.coins -= crop.cost; state.seeds[key] = (state.seeds[key] || 0) + 3;
          showToast(`A little packet of ${crop.name.toLowerCase()} seeds!`);
        }
        state.seed = key; save(); render();
      });
      container.appendChild(button);
    });
  }
  function handlePlot(index) {
    const plot = state.plots[index];
    if (state.tool === 'plant') {
      if (plot) { showToast('This bed is already growing something.'); return; }
      if ((state.seeds[state.seed] || 0) < 1) { showToast(`No ${crops[state.seed].name.toLowerCase()} seeds left. Pick up a packet!`); return; }
      state.seeds[state.seed]--; state.plots[index] = { crop: state.seed, growth: 0, watered: false };
      showToast(`${crops[state.seed].name} seed planted. Give it a drink!`);
    } else if (state.tool === 'water') {
      if (!plot) { showToast('Nothing planted here just yet.'); return; }
      if (plot.growth >= crops[plot.crop].days) { showToast('This one is ripe and ready to pick!'); return; }
      if (plot.watered) { showToast('This little bed has had a drink already.'); return; }
      plot.watered = true; showToast('A refreshing drink for your crop.');
    } else if (state.tool === 'harvest') {
      if (!plot) { showToast('Nothing to harvest in this bed.'); return; }
      if (plot.growth < crops[plot.crop].days) { showToast('Not quite ripe — give it a little more time.'); return; }
      const crop = crops[plot.crop]; state.coins += crop.value; state.harvests++;
      state.seeds[plot.crop] = (state.seeds[plot.crop] || 0) + 1;
      state.plots[index] = null;
      state.lastMessage = `“A little ${crop.name.toLowerCase()} goes a long way.”`;
      showToast(`Lovely ${crop.name.toLowerCase()}! +${crop.value} ✦ and 1 seed`);
    } else {
      if (!plot) { showToast('This bed is already clear and ready.'); return; }
      state.plots[index] = null; showToast('All cleared — a fresh start for this bed.');
    }
    save(); render();
  }
  function getJournalLine() {
    if (state.harvests >= 8) return '“Look at you, growing a whole little world.”';
    if (state.harvests >= 3) return '“Good things grow when you give them time.”';
    if (state.day >= 5) return '“Slow days make the sweetest harvests.”';
    return '“Every garden starts with a single seed.”';
  }
  function nextWeather() {
    const roll = Math.random();
    state.weather = roll < .2 ? 2 : roll < .42 ? 1 : roll < .56 ? 3 : 0;
  }
  function endDay() {
    const weather = weatherTypes[state.weather]; let grew = 0; let thirsty = 0;
    state.plots.forEach(plot => {
      if (!plot || plot.growth >= crops[plot.crop].days) return;
      if (plot.watered || weather.rain) { plot.growth++; grew++; }
      else thirsty++;
      plot.watered = false;
    });
    if (grew > 0 && thirsty === 0) state.streak++;
    else if (grew > 0) state.streak = 0;
    else if (state.plots.some(Boolean) && !weather.rain) state.streak = 0;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    const oldSeason = seasonIndex(); state.day++; nextWeather();
    const changedSeason = seasonIndex() !== oldSeason;
    const modal = $('modalBackdrop');
    $('modalTitle').textContent = `Day ${dayInSeason()}`;
    $('modalText').textContent = changedSeason ? `Welcome to ${season().name.toLowerCase()}! A fresh chapter for your little acre.` : `The garden is waking up on ${weatherTypes[state.weather].name.toLowerCase()} morning.`;
    const messages = [];
    if (grew) messages.push(`✦ ${grew} ${grew === 1 ? 'crop has' : 'crops have'} grown a little taller.`);
    if (thirsty) messages.push(`💧 ${thirsty} ${thirsty === 1 ? 'bed needs' : 'beds need'} a drink to grow.`);
    if (weatherTypes[state.weather].rain) messages.push('🌧️ Rain is doing the watering today.');
    if (changedSeason) messages.push(`${season().icon} ${season().name} seeds are now in season.`);
    if (!messages.length) messages.push('🌱 Plant a seed and give it a drink to get growing.');
    $('morningSummary').innerHTML = messages.map(message => `<div>${message}</div>`).join('');
    save(); render(); modal.hidden = false;
  }
  document.querySelectorAll('.tool-button').forEach(button => button.addEventListener('click', () => {
    state.tool = button.dataset.tool; save(); render();
    if (state.tool !== 'plant') showToast(`${button.querySelector('strong').textContent} selected.`);
  }));
  $('sleepButton').addEventListener('click', endDay);
  $('closeModal').addEventListener('click', () => { $('modalBackdrop').hidden = true; });
  $('modalBackdrop').addEventListener('click', event => { if (event.target === $('modalBackdrop')) $('modalBackdrop').hidden = true; });
  $('soundToggle').addEventListener('click', () => {
    soundOn = !soundOn; $('soundToggle').classList.toggle('muted', !soundOn);
    showToast(soundOn ? 'Little garden sounds are on (coming soon).' : 'Garden sounds are off.');
  });
  state.weather = Number.isInteger(state.weather) && state.weather >= 0 && state.weather < weatherTypes.length ? state.weather : 0;
  render();
  if (!localStorage.getItem(SAVE_KEY)) setTimeout(() => showToast('Plant a seed, water it, then end the day to grow!'), 500);
})();
