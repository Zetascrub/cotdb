const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function shell() {
  const context = vm.createContext({window: {}});
  for (const file of ['filesystem.js', 'shell.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'dist', file), 'utf8'), context);
  }
  return context.window.BunnyShell;
}

test('navigates directories and reads virtual files', () => {
  const sh = shell();
  assert.equal(sh.run('pwd').text, '/home/guest');
  assert.match(sh.run('ls -la').text, /\.bash_history/);
  assert.equal(sh.run('cd notes').text, '');
  assert.equal(sh.prompt(), 'guest@warren:~/notes$');
  assert.match(sh.run('cat board.txt').text, /BBS NOTE 001/);
  assert.match(sh.run('tree ..').text, /trail\//);
  assert.match(sh.run('cat \/root\/flag.txt').text, /Permission denied/);
  assert.equal(sh.run('cd /does-not-exist').error, true);
});

test('returns fictional Linux enumeration data without executing host commands', () => {
  const sh = shell();
  assert.match(sh.run('cat /etc/os-release').text, /BunnyOS/);
  assert.match(sh.run('uname -a').text, /6\.6\.6-bunny/);
  assert.match(sh.run('id').text, /uid=1000\(guest\)/);
  assert.match(sh.run('ps aux').text, /wagond/);
  assert.match(sh.run('ss -tulpen').text, /bunnyd/);
  assert.match(sh.run('sudo -l').text, /\/usr\/bin\/carrot/);
  assert.equal(sh.run('rm -rf /'), null);
});

test('searches and pipes through the virtual tree', () => {
  const sh = shell();
  assert.match(sh.run('find /home/guest -name "*.txt"').text, /notes\/board\.txt/);
  assert.equal(sh.run('find / -perm -4000').text, '/usr/bin/carrot');
  assert.match(sh.run('cat /etc/passwd | grep bunny').text, /bunny:x:1001/);
  assert.equal(sh.run('cat /etc/passwd | grep bunny | wc -l').text, '1');
});
