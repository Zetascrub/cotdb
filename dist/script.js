const form = document.querySelector('#terminal-form');
const input = document.querySelector('#command-input');
const output = document.querySelector('#terminal-output');

const responses = {
  help: 'Commands: help, about, phreak, phrack, rabbit, clear',
  about: 'Cult of the Dead Bunnies // a handmade corner of the old web. Follow the rabbit.',
  phreak: 'The phone system had its own language: tones, trunks, switches, and people curious enough to listen.',
  phrack: 'Plain-text hacker zines travelled farther than any wagon. Keep reading; keep asking questions.',
  rabbit: ' (\\_/)\n (x.x)\n / >o   The trail continues.'
};

function print(prefix, message) {
  const line = document.createElement('p');
  if (prefix) {
    const label = document.createElement('span');
    label.className = 'prompt';
    label.textContent = prefix;
    line.append(label, document.createTextNode(` ${message}`));
  } else {
    line.textContent = message;
  }
  output.append(line);
  output.scrollTop = output.scrollHeight;
}

function run(raw) {
  const command = raw.trim().toLowerCase();
  if (!command) return;
  if (command === 'clear') {
    output.replaceChildren();
    return;
  }
  print('cotdb>', command);
  print('', Object.hasOwn(responses, command) ? responses[command] : `Unknown command: ${command}. Type help.`);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  run(input.value);
  input.value = '';
  input.focus();
});

document.querySelectorAll('[data-command]').forEach((button) => {
  button.addEventListener('click', () => {
    run(button.dataset.command);
    input.focus();
  });
});
