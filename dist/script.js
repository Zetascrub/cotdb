const form = document.querySelector('#terminal-form');
const input = document.querySelector('#command-input');
const output = document.querySelector('#terminal-output');

const responses = {
  help: 'Available commands: help, whoami, lore, rabbit, date, clear',
  whoami: 'guest // curious visitor // honorary member of the warren',
  lore: 'The rabbit follows a signal. The wagon carries the good questions. The rest is static.',
  rabbit: ' (\\_/)\n (x.x)\n / >o   You found the dead bunny.',
  date: () => new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
};

function addLine(prefix, message) {
  const line = document.createElement('p');
  const label = document.createElement('span');
  label.className = 'prompt';
  label.textContent = prefix;
  line.append(label, document.createTextNode(` ${message}`));
  output.append(line);
  output.scrollTop = output.scrollHeight;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const command = input.value.trim().toLowerCase();
  if (!command) return;
  addLine('guest>', command);
  if (command === 'clear') {
    output.replaceChildren();
  } else {
    const response = Object.hasOwn(responses, command) ? responses[command] : null;
    addLine('system>', response ? (typeof response === 'function' ? response() : response) : `Unknown command: ${command}. Try help.`);
  }
  input.value = '';
  input.focus();
});
