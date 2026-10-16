const output = document.querySelector('#terminal-output');
const controls = document.querySelector('#terminal-controls');
const form = document.querySelector('#terminal-form');
const input = document.querySelector('#command-input');
const runButton = document.querySelector('#run-command');
const status = document.querySelector('#system-status');
const welcome = document.querySelector('#welcome-template');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const bootLines = [
  ['COTDB MONITOR v1.3', 170],
  ['CHECKING MEMORY .......... 640K OK', 230],
  ['SEARCHING FOR CARRIER ... CONNECTED', 320],
  ['MOUNTING /WARREN ........ OK', 240],
  ['READING FIELD NOTES ..... OK', 230],
  ['UNPACKING WAGON.PNG ..... OK', 330],
  ['CHECKING TRAIL .......... OPEN', 250],
  ['HANDING CONTROL TO GUEST ...', 380]
];

const files = {
  'readme.txt': 'COTDB / CULT OF THE DEAD BUNNIES\nA small terminal on the edge of the old web.\nTry: map, travel, or cat manifesto.txt',
  'manifesto.txt': '01. Stay curious.\n02. Take things apart to understand them.\n03. Leave a trail for the next person.\n04. Feed the bunny.',
  'fieldnotes.txt': 'The wagon is packed. The road ahead is mostly static.\nSomewhere past the crossing, a signal keeps repeating: 2600.'
};
const stops = [
  {name: 'CAMP', detail: 'The wagon waits beside a dim terminal. The trail begins here.'},
  {name: 'PAYPHONE', detail: 'A payphone rings once. Nobody is on the other end.'},
  {name: 'CROSSING', detail: 'The river is shallow. The bunny insists it knows the way.'},
  {name: 'NIGHT BOARD', detail: 'A bulletin board glows in the dark. Someone has left a new text file.'},
  {name: 'WARREN', detail: 'The wagon reaches the warren. The door was open all along.'}
];
const secrets = {
  xyzzy: 'A hollow voice says: welcome to the warren.',
  sudo: 'Permission denied. The bunny already has root.',
  '2600': 'A faint tone answers from somewhere down the line.',
  oregon: 'The wagon made it across the river. The bunny refuses to explain how.',
  moo: 'Wrong cult. The bunny stares at you.'
};
const completions = ['help', 'about', 'files', 'ls', 'cat readme.txt', 'cat manifesto.txt', 'cat fieldnotes.txt', 'map', 'look', 'travel', 'status', 'wagon', 'rabbit', 'whoami', 'date', 'clear', 'reboot'];
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
  line(`cotdb@warren:~$ ${entered}`, 'prompt');
  if (command === 'reboot') {
    boot();
    return;
  }

  if (command === 'help') {
    line('help              show this list\nfiles / ls        list files\ncat <file>        read a file\nmap / look        inspect the trail\ntravel            move the wagon forward\nstatus            check this session\nwagon / rabbit    bring back the bunny\nclear / reboot    start fresh', 'response');
  } else if (command === 'about') {
    line('Cult of the Dead Bunnies // a little corner of the old web. A bunny, a wagon, and a trail of text files.', 'response');
  } else if (command === 'files' || command === 'ls') {
    line('README.TXT    MANIFESTO.TXT    FIELDNOTES.TXT    WAGON.PNG', 'response');
  } else if (command.startsWith('cat ')) {
    const filename = command.slice(4).replace(/^\.\//, '');
    if (Object.hasOwn(files, filename)) line(files[filename], 'response');
    else if (filename === 'wagon.png') line('Binary image. Type wagon to display it.', 'response');
    else line(`No such file: ${filename}. Type files to list the directory.`, 'error');
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
  } else if (command === 'whoami') {
    line('guest@warren // trail companion', 'response');
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
    const matches = completions.filter((item) => item.startsWith(input.value.trim().toLowerCase()));
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
