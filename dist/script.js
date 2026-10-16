const output = document.querySelector('#terminal-output');
const controls = document.querySelector('#terminal-controls');
const form = document.querySelector('#terminal-form');
const input = document.querySelector('#command-input');
const runButton = document.querySelector('#run-command');
const status = document.querySelector('#system-status');
const welcome = document.querySelector('#welcome-template');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const bootLines = [
  'COTDB BIOS v0.9',
  'CHECKING MEMORY ........ OK',
  'MOUNTING /WARREN ....... OK',
  'LOADING WAGON.PNG ...... OK'
];
const visibleCommands = {
  help: 'Commands: help, about, phreak, phrack, rabbit, ls, date, clear, reboot',
  about: 'Cult of the Dead Bunnies // a little corner of the old web. Follow the rabbit.',
  phreak: 'Old phone networks had their own language: tones, switches, and people curious enough to listen.',
  phrack: 'A nod to the plain-text hacker zines that crossed networks one terminal at a time.',
  rabbit: ' (\\_/)\n (x.x)\n / >o   The trail continues.',
  ls: 'about.txt  phreak.txt  phrack.txt  wagon.png  ???',
  date: () => new Date().toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'})
};
const secrets = {
  xyzzy: 'A hollow voice says: welcome to the warren.',
  sudo: 'Permission denied. The bunny already has root.',
  '2600': 'A faint tone answers from somewhere down the line.',
  oregon: 'The wagon made it across the river. The bunny refuses to explain how.',
  moo: 'Wrong cult. The bunny stares at you.'
};
const history = [];
let historyIndex = 0;
let booting = false;

function line(message, className = '') {
  const p = document.createElement('p');
  p.className = className;
  p.textContent = message;
  output.append(p);
  output.scrollTop = output.scrollHeight;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function boot() {
  booting = true;
  controls.hidden = true;
  input.disabled = true;
  runButton.disabled = true;
  status.textContent = 'BOOTING...';
  output.replaceChildren();

  if (!reducedMotion) {
    for (const [index, message] of bootLines.entries()) {
      line(message, 'boot-line');
      await sleep(index === 0 ? 100 : 165);
    }
    await sleep(230);
  }

  output.replaceChildren(welcome.content.cloneNode(true));
  output.scrollTop = 0;
  controls.hidden = false;
  input.disabled = false;
  runButton.disabled = false;
  status.textContent = 'ONLINE';
  booting = false;
}

function execute(raw) {
  if (booting) return;
  const command = raw.trim().toLowerCase();
  if (!command) return;
  history.push(raw.trim());
  historyIndex = history.length;

  if (command === 'clear') {
    output.replaceChildren();
    return;
  }
  line(`cotdb@warren:~$ ${raw.trim()}`, 'prompt');
  if (command === 'reboot') {
    boot();
    return;
  }
  const response = Object.hasOwn(visibleCommands, command) ? visibleCommands[command]
    : Object.hasOwn(secrets, command) ? secrets[command] : null;
  if (response) {
    line(typeof response === 'function' ? response() : response, 'response');
  } else {
    line(`command not found: ${command}. Type help.`, 'error');
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  execute(input.value);
  input.value = '';
  input.focus();
});

input.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowUp' && history.length) {
    event.preventDefault();
    historyIndex = Math.max(0, historyIndex - 1);
    input.value = history[historyIndex];
  } else if (event.key === 'ArrowDown' && history.length) {
    event.preventDefault();
    historyIndex = Math.min(history.length, historyIndex + 1);
    input.value = history[historyIndex] ?? '';
  } else if (event.ctrlKey && event.key.toLowerCase() === 'l') {
    event.preventDefault();
    output.replaceChildren();
  }
});

document.querySelectorAll('[data-command]').forEach((button) => {
  button.addEventListener('click', () => {
    execute(button.dataset.command);
    input.focus();
  });
});

boot();
