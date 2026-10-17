const output = document.querySelector('#terminal-output');
const controls = document.querySelector('#terminal-controls');
const form = document.querySelector('#terminal-form');
const input = document.querySelector('#command-input');
const promptLabel = document.querySelector('#prompt-label');
const runButton = document.querySelector('#run-command');
const status = document.querySelector('#system-status');
const soundToggle = document.querySelector('#sound-toggle');
const welcome = document.querySelector('#welcome-template');
const power = document.querySelector('#power-template');
const bios = document.querySelector('#bios-template');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Use "message, result" for aligned status lines; omit the comma for full-width lines.
const bootLines = [
  ['BUNNYOS MONITOR v0.9', 170],
  ['COPYRIGHT (C) 1996-2026 DEAD BUNNY SYSTEMS', 180],

  ['CHECKING MEMORY, 640K OK', 230],
  ['DETECTING CPU, PROBABLY', 180],
  ['CHECKING FOR COMMON SENSE, NOT FOUND', 320],

  ['LOADING KERNEL, OK', 220],
  ['MOUNTING /WARREN, OK', 240],
  ['MOUNTING /CARROTS, READ ONLY', 200],

  ['SEARCHING FOR CARRIER, CONNECTED', 320],
  ['NEGOTIATING ENCRYPTION, DEFINITELY', 250],
  ['SCANNING 127.0.0.1, HOSTILE', 300],
  ['OPENING BACKDOOR, IT WAS ALREADY OPEN', 300],

  ['CHECKING OPSEC, QUESTIONABLE', 300],
  ['CHECKING FOR FEDS, [REDACTED]', 350],

  ['UNPACKING WAGON.PNG, OK', 330],
  ['LOADING ETHICS.SYS, SKIPPED', 300],

  ['HACKING THE PLANET, FAILED', 800],
  ['RETRYING WITH MORE SUDO, OK', 500],

  ['BLAMING DNS, OK', 350],
  ['SLAPPING THE BUNNY, OK', 500],

  ['RESTORING PLAUSIBLE DENIABILITY, OK', 500],

  ['HANDING CONTROL TO GUEST, ...', 380],
  ['WELCOME TO THE CULT OF THE DEAD BUNNIES', 1000]
];

// Add or edit boot quotes here. Each entry uses "Quote - Author".
const quotes = [
  "If it ain't broke, give me 5 minutes - Zetascrub",
  'The trail is long, but the rabbit knows a shortcut - The Warren',
  'Every dial tone is a door if you listen long enough - BunnyOS',
  'Read the files. Follow the tracks. Mind the river - The Warren',
];

const secrets = {
  xyzzy: 'A hollow voice says: welcome to the warren.',
  '2600': 'A faint tone answers from somewhere down the line.',
  oregon: 'The wagon made it across the river. The bunny refuses to explain how.',
  moo: 'Wrong cult. The bunny stares at you.',
  'pineapple': 'On pizza or over the wifi?.'
};
const completions = ['help', 'about', 'status', 'wagon', 'rabbit', 'date', 'clear', 'reboot', 'poweroff', 'shutdown'];
const history = [];
let historyIndex = 0;
let commandCount = 0;
let sessionStart = Date.now();
let booting = false;
let poweredOff = true;
let authenticating = false;
let biosResolve = null;
let biosTimer = null;

function line(message, className = '') {
  const p = document.createElement('p');
  p.className = className;
  p.textContent = message;
  output.append(p);
  output.scrollTop = output.scrollHeight;
}

function bootLine(message) {
  const separator = message.indexOf(',');
  if (separator === -1) {
    line(message, 'boot-line');
    return false;
  }
  const label = message.slice(0, separator).trim();
  const result = message.slice(separator + 1).trim();
  const failed = /\bFAILED\b/i.test(result);
  const row = document.createElement('p');
  row.className = 'boot-line boot-line-pair';
  row.setAttribute('aria-label', `${label}: ${result}`);
  const name = document.createElement('span');
  name.className = 'boot-label';
  name.textContent = label;
  name.setAttribute('aria-hidden', 'true');
  const value = document.createElement('span');
  value.className = failed ? 'boot-result boot-failed' : 'boot-result';
  value.textContent = result;
  value.setAttribute('aria-hidden', 'true');
  row.append(name, value);
  output.append(row);
  output.scrollTop = output.scrollHeight;
  return failed;
}

function showWagon() {
  const image = document.createElement('img');
  image.className = 'terminal-image';
  image.alt = 'White pixel-art bunny pulling a covered wagon';
  image.width = 1774;
  image.height = 887;
  image.addEventListener('load', () => { output.scrollTop = output.scrollHeight; }, {once: true});
  image.src = 'assets/bunny-wagon-v2.png';
  output.append(image);
  output.scrollTop = output.scrollHeight;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function showPowerScreen() {
  poweredOff = true;
  booting = false;
  window.BunnyAudio.stopDrive();
  window.BunnyShell.reset();
  window.BunnyGames.reset();
  history.length = 0;
  historyIndex = 0;
  commandCount = 0;
  input.value = '';
  input.type = 'text';
  input.disabled = true;
  runButton.disabled = true;
  controls.hidden = true;
  status.textContent = 'OFFLINE';
  output.setAttribute('aria-live', 'polite');
  output.replaceChildren(power.content.cloneNode(true));
  output.scrollTop = 0;
  output.querySelector('#boot-button').focus({preventScroll: true});
}

function leaveBios() {
  if (!biosResolve) return;
  window.clearTimeout(biosTimer);
  biosTimer = null;
  const resolve = biosResolve;
  biosResolve = null;
  resolve();
}

function biosChoice(choice) {
  if (!biosResolve) return;
  if (choice === '1') return leaveBios();
  const message = choice === '2' ? 'Drive A: not ready. Select another device.' :
    choice === '3' ? 'PXE-E53: No boot filename received.' : '';
  if (message) {
    output.querySelector('#bios-message').textContent = message;
    window.BunnyAudio.error();
  }
}

function showBiosMenu() {
  if (!biosResolve) return;
  window.clearTimeout(biosTimer);
  biosTimer = null;
  output.querySelector('#bios-menu').hidden = false;
  output.querySelector('#bios-message').textContent = 'Select a boot device:';
  window.BunnyAudio.boot();
}

async function showBios() {
  output.replaceChildren(bios.content.cloneNode(true));
  status.textContent = 'POST...';
  await new Promise((resolve) => {
    biosResolve = resolve;
    biosTimer = window.setTimeout(leaveBios, reducedMotion ? 1400 : 4400);
  });
}

async function boot() {
  if (booting) return;
  poweredOff = false;
  booting = true;
  controls.hidden = true;
  input.disabled = true;
  runButton.disabled = true;
  status.textContent = 'BOOTING...';
  output.setAttribute('aria-live', 'off');
  output.replaceChildren();
  commandCount = 0;
  history.length = 0;
  historyIndex = 0;
  window.BunnyShell.reset();
  window.BunnyGames.reset();
  input.type = 'text';
  input.setAttribute('aria-label', 'Type a terminal command');
  promptLabel.textContent = window.BunnyShell.prompt();

  window.BunnyAudio.startDrive();
  try {
    await showBios();
    output.replaceChildren();
    status.textContent = 'LOADING...';
    if (!reducedMotion) {
      for (const [message, delay] of bootLines) {
        const failed = bootLine(message);
        if (failed) window.BunnyAudio.bootFail();
        else window.BunnyAudio.boot();
        await sleep(delay);
      }
      await sleep(220);
    }
  } finally {
    window.BunnyAudio.stopDrive();
  }

  output.replaceChildren(welcome.content.cloneNode(true));
  output.querySelector('#boot-quote').textContent = quotes[Math.floor(Math.random() * quotes.length)];
  output.setAttribute('aria-live', 'polite');
  output.scrollTop = 0;
  controls.hidden = false;
  input.disabled = false;
  runButton.disabled = false;
  sessionStart = Date.now();
  updateStatus();
  window.BunnyAudio.success();
  booting = false;
  if (window.matchMedia('(pointer: fine)').matches) {
    input.focus({preventScroll: true});
  }
}

function updateStatus() {
  status.textContent = `ONLINE · ${window.BunnyShell.prompt().split('@')[0].toUpperCase()}`;
}

async function run(raw) {
  if (poweredOff || booting || authenticating) return;
  if (window.BunnyShell.isAwaitingPassword()) {
    authenticating = true;
    input.disabled = true;
    runButton.disabled = true;
    const result = await window.BunnyShell.authenticate(raw);
    line(result.text, result.error ? 'error' : 'response');
    window.BunnyAudio[result.error ? 'error' : 'success']();
    input.type = 'text';
    input.setAttribute('aria-label', 'Type a terminal command');
    promptLabel.textContent = window.BunnyShell.prompt();
    updateStatus();
    input.disabled = false;
    runButton.disabled = false;
    authenticating = false;
    input.focus();
    return;
  }
  const entered = raw.trim();
  const command = entered.toLowerCase().replace(/\s+/g, ' ');
  if (!command) return;
  window.BunnyAudio.command();
  history.push(entered);
  historyIndex = history.length;
  commandCount += 1;

  if (command === 'clear') {
    output.replaceChildren();
    return;
  }
  line(promptLabel.textContent + ' ' + entered, 'prompt');
  if (command === 'reboot') {
    void boot();
    return;
  }
  if (command === 'poweroff' || command === 'shutdown') {
    window.BunnyAudio.powerOff();
    showPowerScreen();
    return;
  }
  const shellResult = window.BunnyShell.run(entered);
  if (shellResult) {
    if (shellResult.error) window.BunnyAudio.error();
    else if (shellResult.sound === 'success') window.BunnyAudio.success();
    const passwordPrompt = window.BunnyShell.isAwaitingPassword();
    if (shellResult.text && !passwordPrompt) line(shellResult.text, shellResult.error ? 'error' : 'response');
    input.type = passwordPrompt ? 'password' : 'text';
    input.setAttribute('aria-label', passwordPrompt ? 'Enter bunny password' : 'Type a terminal command');
    promptLabel.textContent = passwordPrompt ? 'Password:' : window.BunnyShell.prompt();
    updateStatus();
    return;
  }

  if (command === 'help') {
    line('help                 show this list\npwd / cd <path>      move through directories\nls / files [-la]     list a directory\ncat <file>           read a text file\nhead / tail <file>   read part of a file\ntree [path]          show directory branches\ngames                list terminal games\nstatus               check this session\nwagon / rabbit       bring back the bunny\nclear / reboot       start fresh\npoweroff             return to power screen', 'response');
  } else if (command === 'about') {
    line('Cult of the Dead Bunnies // a little corner of the old web. A bunny, a wagon, and a trail of text files.', 'response');
  } else if (command === 'status') {
    const uptime = Math.floor((Date.now() - sessionStart) / 1000);
    line(`Terminal online · ${uptime}s uptime · ${commandCount} commands · ${window.BunnyGames.status()}`, 'response');
  } else if (command === 'wagon') {
    showWagon();
  } else if (command === 'rabbit') {
    line(' (\\_/)\n (x.x)\n / >o   The trail continues.', 'response');
  } else if (command === 'date') {
    line(new Date().toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'}), 'response');
  } else if (Object.hasOwn(secrets, command)) {
    line(secrets[command], 'response');
  } else {
    line(`command not found: ${command}. Type help.`, 'error');
    window.BunnyAudio.error();
  }
}

soundToggle.addEventListener('click', async () => {
  soundToggle.disabled = true;
  const enabled = await window.BunnyAudio.toggle();
  soundToggle.textContent = enabled ? 'SFX ON' : 'SFX OFF';
  soundToggle.setAttribute('aria-pressed', String(enabled));
  soundToggle.setAttribute('aria-label', enabled ? 'Disable sound effects' : 'Enable sound effects');
  soundToggle.disabled = false;
  if (enabled && booting) window.BunnyAudio.startDrive();
});

output.addEventListener('click', (event) => {
  if (event.target.closest('#boot-button')) {
    void boot();
    return;
  }
  if (event.target.closest('[data-bios-menu]')) showBiosMenu();
  const choice = event.target.closest('[data-bios-choice]');
  if (choice) biosChoice(choice.dataset.biosChoice);
});

window.addEventListener('keydown', (event) => {
  if (!biosResolve) return;
  if (event.key === 'F12') {
    event.preventDefault();
    showBiosMenu();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    leaveBios();
  } else if (event.key === 'Enter' && !output.querySelector('#bios-menu').hidden) {
    event.preventDefault();
    leaveBios();
  } else if (['1', '2', '3'].includes(event.key) && !output.querySelector('#bios-menu').hidden) {
    event.preventDefault();
    biosChoice(event.key);
  }
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const entered = input.value;
  input.value = '';
  void run(entered);
  if (!authenticating) input.focus();
});

input.addEventListener('keydown', (event) => {
  if (window.BunnyShell.isAwaitingPassword()) {
    if (event.key === 'Escape' || (event.ctrlKey && event.key.toLowerCase() === 'c')) {
      event.preventDefault();
      window.BunnyShell.cancelPassword();
      input.value = '';
      input.type = 'text';
      input.setAttribute('aria-label', 'Type a terminal command');
      promptLabel.textContent = window.BunnyShell.prompt();
      line('^C', 'response');
    } else if (['ArrowUp', 'ArrowDown', 'Tab'].includes(event.key)) event.preventDefault();
    return;
  }
  if (!event.ctrlKey && !event.altKey && !event.metaKey && (event.key.length === 1 || event.key === 'Backspace')) {
    window.BunnyAudio.key();
  }
  if (event.key === 'ArrowUp' && history.length) {
    event.preventDefault();
    historyIndex = Math.max(0, historyIndex - 1);
    input.value = history[historyIndex];
  } else if (event.key === 'ArrowDown' && history.length) {
    event.preventDefault();
    historyIndex = Math.min(history.length, historyIndex + 1);
    input.value = history[historyIndex] ?? '';
  } else if (event.key === 'Tab') {
    event.preventDefault();
    const typed = input.value;
    const leading = typed.match(/^\s*/)[0];
    const local = /^\s*\S*$/.test(typed)
      ? completions.filter((item) => item.startsWith(typed.trimStart())).map((item) => leading + item) : [];
    const matches = [...new Set([...local, ...window.BunnyShell.complete(typed)])];
    if (matches.length === 1) input.value = matches[0];
    else if (matches.length > 1 && typed.trim()) {
      const prefix = matches.reduce((shared, match) => {
        let length = 0;
        while (length < shared.length && shared[length] === match[length]) length++;
        return shared.slice(0, length);
      });
      if (prefix.length > typed.length) input.value = prefix;
      else line(matches.join('  '), 'response');
    }
  } else if (event.ctrlKey && event.key.toLowerCase() === 'l') {
    event.preventDefault();
    output.replaceChildren();
  }
});

document.querySelectorAll('[data-command]').forEach((button) => {
  button.addEventListener('click', () => {
    if (window.BunnyShell.isAwaitingPassword()) return;
    run(button.dataset.command);
    input.focus();
  });
});

output.addEventListener('click', () => {
  if (!booting) input.focus();
});

showPowerScreen();
