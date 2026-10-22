const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const bcrypt = require('../dist/vendor/bcrypt.min.js');

// Flag 'COTDB{bunny_made_it_home}' sealed with the test password 'bunny123' (scripts/seal-flag.mjs).
// The real password never appears here; tests swap in this blob alongside the test hash.
const TEST_FLAG_BLOB = 'ZD0/HtvmHa03cASK7L5C8fabs+KZZKEP0/Oneqe4aWolLhCnSSPUJarunPdXhb7YuKt+tRZ+a2Sv/4ZnnOMI5Bbhidun';

function shell(testHash) {
  const context = vm.createContext({window: {}, setTimeout, clearTimeout, crypto, atob, btoa, TextEncoder, TextDecoder});
  for (const file of ['vendor/bcrypt.min.js', 'filesystem.js', 'games.js', 'shell.js']) {
    let source = fs.readFileSync(path.join(__dirname, '..', 'dist', file), 'utf8');
    if (file === 'games.js' && testHash) {
      source = source.replace(/(const bunnyHash = ')[^']+(';)/, (_, before, after) => before + testHash + after)
        .replace(/(const flagBlob = ')[^']+(';)/, (_, before, after) => before + TEST_FLAG_BLOB + after);
    }
    vm.runInContext(source, context);
    if (file === 'vendor/bcrypt.min.js') context.window.dcodeIO = context.dcodeIO;
  }
  return {sh: context.window.BunnyShell, games: context.window.BunnyGames};
}

test('navigates directories and reads virtual files', () => {
  const {sh} = shell();
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
  const {sh} = shell();
  assert.match(sh.run('cat /etc/os-release').text, /BunnyOS/);
  assert.match(sh.run('uname -a').text, /6\.6\.6-bunny/);
  assert.match(sh.run('id').text, /uid=1000\(guest\)/);
  assert.match(sh.run('ps aux').text, /wagond/);
  assert.match(sh.run('ss -tulpen').text, /bunnyd/);
  assert.match(sh.run('sudo -l').text, /\/usr\/bin\/carrot/);
  assert.equal(sh.run('rm -rf /'), null);
});

test('searches and pipes through the virtual tree', () => {
  const {sh} = shell();
  assert.match(sh.run('find /home/guest -name "*.txt"').text, /notes\/board\.txt/);
  assert.equal(sh.run('find / -perm -4000').text, '/usr/bin/carrot');
  assert.match(sh.run('cat /etc/passwd | grep bunny').text, /bunny:x:1001/);
  assert.equal(sh.run('cat /etc/passwd | grep bunny | wc -l').text, '1');
  // Pipe/operator characters are literal inside quotes, special only outside them.
  assert.equal(sh.run('echo "a|b"').text, 'a|b');
  assert.equal(sh.run('echo "x;y"').text, 'x;y');
  assert.match(sh.run('ls; ls').text, /operators are not available/);
});

test('completes nested paths without suggesting private files', () => {
  const {sh} = shell();
  assert.deepEqual(Array.from(sh.complete('cat /var/lo')), ['cat /var/log/']);
  assert.deepEqual(Array.from(sh.complete('cat /var/log/wa')), ['cat /var/log/warren.log']);
  assert.deepEqual(Array.from(sh.complete('cat /var/log/ti')), ['cat /var/log/tickets.log']);
  assert.deepEqual(Array.from(sh.complete('cat notes/bo')), ['cat notes/board.txt']);
  assert.deepEqual(Array.from(sh.complete('cat ~/no')), ['cat ~/notes/']);
  assert.deepEqual(Array.from(sh.complete('cd /home/b')), []);
  assert.deepEqual(Array.from(sh.complete('cat /home/bunny/Fl')), []);
  assert.match(sh.run('cat /var/log/tickets.log').text, /Trail leaks the password hash of the current user/);
});

test('guest cannot read bunny files through direct or recursive commands', () => {
  const {sh} = shell();
  for (const command of [
    'cd /home/bunny', 'ls /home/bunny', 'cat /home/bunny/Flag.txt',
    'head /home/bunny/Flag.txt', 'file /home/bunny/Flag.txt', 'stat /home/bunny/Flag.txt',
    'grep COTDB /home/bunny/Flag.txt', 'find /home/bunny'
  ]) assert.match(sh.run(command).text, /Permission denied/, command);
  assert.doesNotMatch(sh.run('tree /').text, /Flag\.txt/);
  assert.doesNotMatch(sh.run('find / -name Flag.txt').text, /Flag\.txt/);
  assert.doesNotMatch(sh.run('grep -R COTDB /').text, /bunny_made_it_home/);
  assert.match(sh.run('ls -l /home').text, /drwx------.*bunny/);
});

test('trail completion reveals the supplied bcrypt hash', () => {
  const {sh, games} = shell();
  assert.match(sh.run('games').text, /trail/);
  assert.match(sh.run('travel').text, /CAMP/);
  assert.match(sh.run('trail pack').text, /RIVER CROSSING/);
  assert.match(sh.run('trail ford').text, /PRAIRIE/);
  assert.match(sh.run('trail hunt').text, /MOUNTAIN PASS/);
  const finish = sh.run('trail rest').text;
  assert.match(finish, /Bunny password hash \(bcrypt\)/);
  assert.ok(finish.includes(games.passwordHash));
  assert.equal(games.passwordHash, '$2a$12$HrnmCRhtMtdf6CPsLC.9LeT5eruGpal6CHBQoyiF0qd80P4SGfBdO');
});

test('bcrypt password switches to bunny and logout restores guest permissions', async () => {
  const {sh, games} = shell(bcrypt.hashSync('bunny123', 4));
  assert.equal(sh.run('su bunny').text, 'Password:');
  assert.equal(sh.isAwaitingPassword(), true);
  assert.match((await sh.authenticate('wrong')).text, /Authentication failure/);
  assert.match(sh.run('cat /home/bunny/Flag.txt').text, /Permission denied/);
  sh.run('su bunny');
  assert.match((await sh.authenticate('bunny123')).text, /Welcome home/);
  assert.equal(sh.prompt(), 'bunny@warren:~$');
  assert.equal(sh.run('whoami').text, 'bunny');
  assert.equal(sh.run('cat Flag.txt').text, 'COTDB{bunny_made_it_home}');
  assert.deepEqual(Array.from(sh.complete('cat Fl')), ['cat Flag.txt']);
  assert.match(sh.run('su root').text, /Authentication failure/);
  assert.match(sh.run('cat /root/flag.txt').text, /Permission denied/);
  assert.equal(sh.run('exit').text, 'Logged out of bunny.');
  assert.match(sh.run('cat /home/bunny/Flag.txt').text, /Permission denied/);
  sh.reset(); games.reset();
  assert.equal(sh.run('whoami').text, 'guest');
  assert.match(sh.run('trail').text, /CAMP/);
});

test('the flag is sealed in source and both password routes agree', () => {
  const dist = path.join(__dirname, '..', 'dist');
  for (const file of ['filesystem.js', 'games.js', 'shell.js', 'script.js']) {
    assert.doesNotMatch(fs.readFileSync(path.join(dist, file), 'utf8'), /COTDB\{/, `${file} leaks the flag`);
  }
  // Route B easter egg: the .whisper clue (base64, then ROT13) must give the Route A password.
  const filesystem = fs.readFileSync(path.join(dist, 'filesystem.js'), 'utf8');
  const clue = filesystem.match(/'\.whisper':\s*textFile\('([^']*)'/)[1].split('\\n').pop();
  const rot13 = (s) => s.replace(/[a-z]/g, (c) => String.fromCharCode((c.charCodeAt(0) - 97 + 13) % 26 + 97));
  const password = rot13(Buffer.from(clue, 'base64').toString('utf8'));
  const {games} = shell();
  assert.equal(bcrypt.compareSync(password, games.passwordHash), true);
});

test('trail can fail and other games respond', () => {
  const {sh} = shell();
  sh.run('trail');
  sh.run('trail scout');
  assert.match(sh.run('trail ferry').text, /cannot go on/);
  assert.doesNotMatch(sh.run('trail').text, /hash/);
  assert.match(sh.run('guess').text, /GUESS THE FREQUENCY/);
  assert.match(sh.run('rps').text, /ROCK \/ PAPER \/ SCISSORS/);
});

test('cult arcade games accept moves, reject mistakes, and reset', () => {
  const {sh, games} = shell();
  assert.match(sh.run('games').text, /wopr.*sneakers.*bbs/s);
  assert.match(sh.run('wopr').text, /1 \| 2 \| 3/);
  assert.match(sh.run('wopr 1').text, /X \|/);
  assert.match(sh.run('wopr 1').text, /occupied/);
  assert.match(sh.run('wopr restart').text, /1 \| 2 \| 3/);

  assert.match(sh.run('sneakers').text, /BIBRAT ELOH/);
  assert.match(sh.run('sneakers wrong').text, /not quite/);
  assert.match(sh.run('sneakers rabbit hole').text, /LIAD ENOT/);
  assert.match(sh.run('sneakers dial tone').text, /DDEA YNNUB/);
  assert.match(sh.run('sneakers dead bunny').text, /All three phrases recovered/);

  assert.match(sh.run('bbs').text, /CONNECTED/);
  assert.match(sh.run('bbs door 2600').text, /explore messages and files/);
  assert.match(sh.run('bbs messages').text, /2600/);
  assert.match(sh.run('bbs files').text, /night-board/);
  assert.match(sh.run('bbs door 1234').text, /bad code/);
  assert.match(sh.run('bbs door 2600').text, /ACCESS GRANTED/);
  games.reset();
  assert.match(sh.run('bbs').text, /CONNECTED/);
  assert.match(sh.run('sneakers').text, /BIBRAT ELOH/);
});
