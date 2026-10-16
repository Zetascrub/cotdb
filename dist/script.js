const output = document.querySelector('#terminal-output');
const controls = document.querySelector('#terminal-controls');
const form = document.querySelector('#terminal-form');
const input = document.querySelector('#command-input');
const promptLabel = document.querySelector('#prompt-label');
const runButton = document.querySelector('#run-command');
const status = document.querySelector('#system-status');
const welcome = document.querySelector('#welcome-template');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const bootLines = [
  ['BUNNYOS MONITOR v0.9', 170],
  ['CHECKING MEMORY .......... 640K OK', 230],
  ['SEARCHING FOR CARRIER ... CONNECTED', 320],
  ['MOUNTING /WARREN ........ OK', 240],
  ['READING FIELD NOTES ..... OK', 230],
  ['UNPACKING WAGON.PNG ..... OK', 330],
  ['CHECKING TRAIL .......... OPEN', 250],
  ['HANDING CONTROL TO GUEST ...', 380]
];

const stops = [
  {name: 'CAMP', detail: 'The wagon waits beside a dim terminal. The trail begins here.'},
  {name: 'PAYPHONE', detail: 'A payphone rings once. Nobody is on the other end.'},
  {name: 'CROSSING', detail: 'The river is shallow. The bunny insists it knows the way.'},
  {name: 'NIGHT BOARD', detail: 'A bulletin board glows in the dark. Someone has left a new text file.'},
  {name: 'WARREN', detail: 'The wagon reaches the warren. The door was open all along.'}
];
const secrets = {
  xyzzy: 'A hollow voice says: welcome to the warren.',
  '2600': 'A faint tone answers from somewhere down the line.',
  oregon: 'The wagon made it across the river. The bunny refuses to explain how.',
  moo: 'Wrong cult. The bunny stares at you.'
};
const completions = ['help', 'about', 'map', 'look', 'travel', 'status', 'wagon', 'rabbit', 'date', 'clear', 'reboot'];
const history = [];
let historyIndex = 0;
let trailIndex = 0;
let commandCount = 0;
let sessionStart = Date.now();
let booting = false;

function line(message, className = '') {
  const p = document.createElement('p');
  p.className = className;
  p.textContent = message;
  output.append(p);
  output.scrollTop = output.scrollHeight;
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

async function boot() {
  booting = true;
  controls.hidden = true;
  input.disabled = true;
  runButton.disabled = true;
  status.textContent = 'BOOTING...';
  output.setAttribute('aria-live', 'off');
  output.replaceChildren();
  trailIndex = 0;
  commandCount = 0;
  history.length = 0;
  historyIndex = 0;
  window.BunnyShell.reset();
  promptLabel.textContent = window.BunnyShell.prompt();

  if (!reducedMotion) {
    for (const [message, delay] of bootLines) {
      line(message, 'boot-line');
      await sleep(delay);
    }
    await sleep(220);
  }

  output.replaceChildren(welcome.content.cloneNode(true));
  output.setAttribute('aria-live', 'polite');
  output.scrollTop = 0;
  controls.hidden = false;
  input.disabled = false;
  runButton.disabled = false;
  sessionStart = Date.now();
  updateStatus();
  booting = false;
  if (window.matchMedia('(pointer: fine)').matches) {
    input.focus({preventScroll: true});
  }
}

function updateStatus() {
  status.textContent = `ONLINE · ${trailIndex}/${stops.length - 1}`;
}

function map() {
  return stops.map((stop, index) => `${index === trailIndex ? '>' : ' '} ${index === trailIndex ? '[x]' : '[ ]'} ${stop.name}`).join('  --  ');
}

function run(raw) {
  if (booting) return;
  const entered = raw.trim();
  const command = entered.toLowerCase().replace(/\s+/g, ' ');
  if (!command) return;
  history.push(entered);
  historyIndex = history.length;
  commandCount += 1;

  if (command === 'clear') {
    output.replaceChildren();
    return;
  }
  line(promptLabel.textContent + ' ' + entered, 'prompt');
  if (command === 'reboot') {
    boot();
    return;
  }
  const shellResult = window.BunnyShell.run(entered);
  if (shellResult) {
    if (shellResult.text) line(shellResult.text, shellResult.error ? 'error' : 'response');
    promptLabel.textContent = window.BunnyShell.prompt();
    return;
  }

  if (command === 'help') {
    line('help                 show this list\npwd / cd <path>      move through directories\nls / files [-la]     list a directory\ncat <file>           read a text file\nhead / tail <file>   read part of a file\ntree [path]          show directory branches\nmap / look / travel  follow the wagon trail\nstatus               check this session\nwagon / rabbit       bring back the bunny\nclear / reboot       start fresh', 'response');
  } else if (command === 'about') {
    line('Cult of the Dead Bunnies // a little corner of the old web. A bunny, a wagon, and a trail of text files.', 'response');
  } else if (command === 'map') {
    line(map(), 'response');
  } else if (command === 'look') {
    line(`${stops[trailIndex].name}: ${stops[trailIndex].detail}`, 'response');
  } else if (command === 'travel') {
    if (trailIndex < stops.length - 1) trailIndex += 1;
    line(`${stops[trailIndex].name}: ${stops[trailIndex].detail}`, 'response');
    if (trailIndex === stops.length - 1) line('End of the trail. Type reboot to begin again.', 'response');
    updateStatus();
  } else if (command === 'status') {
    const uptime = Math.floor((Date.now() - sessionStart) / 1000);
    line(`Terminal online · ${uptime}s uptime · ${commandCount} commands · trail ${trailIndex}/${stops.length - 1} (${stops[trailIndex].name})`, 'response');
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
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  run(input.value);
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
  } else if (event.key === 'Tab') {
    event.preventDefault();
    const matches = [...new Set([...completions.filter((item) => item.startsWith(input.value.trim().toLowerCase())), ...window.BunnyShell.complete(input.value.trim())])];
    if (matches.length === 1) input.value = matches[0];
    else if (matches.length > 1 && input.value.trim()) line(matches.join('  '), 'response');
  } else if (event.ctrlKey && event.key.toLowerCase() === 'l') {
    event.preventDefault();
    output.replaceChildren();
  }
});

document.querySelectorAll('[data-command]').forEach((button) => {
  button.addEventListener('click', () => {
    run(button.dataset.command);
    input.focus();
  });
});

output.addEventListener('click', () => {
  if (!booting) input.focus();
});

boot();
