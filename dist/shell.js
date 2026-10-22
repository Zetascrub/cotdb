// A small in-memory Linux-like shell. No command reaches the host operating system.
window.BunnyShell = (() => {
  const root = window.COTDB_FS;
  let user = 'guest';
  let cwd = '/home/guest';
  let awaitingPassword = false;
  const home = () => '/home/' + user;
  const ok = (text = '') => ({text, error: false});
  const fail = (text) => ({text, error: true});
  const known = ['pwd', 'cd', 'ls', 'files', 'cat', 'head', 'tail', 'tree', 'find', 'grep', 'file', 'stat', 'echo', 'wc',
    'whoami', 'su', 'exit', 'logout', 'games', 'trail', 'travel', 'guess', 'rps', 'wopr', 'sneakers', 'bbs', 'map', 'look',
    'uname', 'id', 'groups', 'hostname', 'env', 'printenv', 'getent', 'which', 'ps', 'ss', 'netstat', 'ip',
    'ifconfig', 'route', 'arp', 'df', 'free', 'lsblk', 'mount', 'lsof', 'who', 'crontab', 'sudo', 'systemctl', 'hostnamectl', 'lsb_release', 'last', 'lscpu', 'uptime'];

  function path(value = '.') {
    const source = value === '~' ? home() : value.startsWith('~/') ? home() + value.slice(1) : value;
    const parts = source.startsWith('/') ? [] : cwd.split('/').filter(Boolean);
    for (const part of source.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') parts.pop();
      else parts.push(part);
    }
    return '/' + parts.join('/');
  }
  function node(absolute) {
    let current = root;
    for (const part of absolute.split('/').filter(Boolean)) {
      if (current.kind !== 'dir' || !Object.hasOwn(current.entries, part)) return null;
      current = current.entries[part];
    }
    return current;
  }
  const denied = (absolute) => absolute === '/root' || absolute.startsWith('/root/') ||
    (user !== 'bunny' && (absolute === '/home/bunny' || absolute.startsWith('/home/bunny/')));
  const mode = (item) => item.kind === 'dir' ? item.owner === 'bunny' ? 'drwx------' : 'drwxr-xr-x'
    : item.kind === 'program' ? item.suid ? '-rwsr-xr-x' : '-rwxr-xr-x'
      : item.owner === 'bunny' ? '-rw-------' : '-rw-r--r--';
  const size = (item) => item.kind === 'dir' ? 4096 : item.kind === 'image' ? 592061
    : item.kind === 'program' ? 8192 : item.text.length;
  const label = () => cwd === home() ? '~' : cwd.startsWith(home() + '/') ? '~' + cwd.slice(home().length) : cwd;
  function prompt() { return user + '@warren:' + label() + '$'; }
  function reset() { user = 'guest'; cwd = home(); awaitingPassword = false; }
  function isAwaitingPassword() { return awaitingPassword; }
  function cancelPassword() { awaitingPassword = false; }
  async function decryptFlag(password, blob) {
    const raw = Uint8Array.from(atob(blob), (c) => c.charCodeAt(0));
    const salt = raw.slice(0, 16), iv = raw.slice(16, 28), data = raw.slice(28);
    const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      {name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256'}, keyMaterial,
      {name: 'AES-GCM', length: 256}, false, ['decrypt']);
    return new TextDecoder().decode(await crypto.subtle.decrypt({name: 'AES-GCM', iv}, key, data));
  }
  async function unsealFlag(password) {
    const item = node('/home/bunny/Flag.txt');
    if (!item || !window.BunnyGames.flagBlob) return;
    try { item.text = await decryptFlag(password, window.BunnyGames.flagBlob); } catch { /* password was right but decrypt failed; leave it sealed */ }
  }
  async function authenticate(password) {
    if (!awaitingPassword) return fail('su: no password requested');
    awaitingPassword = false;
    try {
      const valid = await new Promise((resolve, reject) => {
        window.dcodeIO.bcrypt.compare(password, window.BunnyGames.passwordHash, (error, match) =>
          error ? reject(error) : resolve(match));
      });
      if (!valid) return fail('su: Authentication failure');
      await unsealFlag(password);
      user = 'bunny';
      cwd = home();
      return ok('Welcome home, bunny.');
    } catch {
      return fail('su: password verification unavailable');
    }
  }

  function tokenize(source) {
    const parts = [];
    let word = '', quote = '', started = false;
    for (let i = 0; i < source.length; i++) {
      const c = source[i];
      if (quote) {
        if (c === quote) quote = '';
        else word += c;
      } else if (c === '"' || c === "'") { quote = c; started = true; }
      else if (/\s/.test(c)) { if (started) { parts.push(word); word = ''; started = false; } }
      else { word += c; started = true; }
    }
    if (quote) return null;
    if (started) parts.push(word);
    return parts;
  }
  // Split on | into pipe stages, but only outside quotes; reject ; & < > only outside quotes.
  function splitPipes(raw) {
    const pieces = [];
    let current = '', quote = '';
    for (const c of raw) {
      if (quote) { if (c === quote) quote = ''; current += c; }
      else if (c === '"' || c === "'") { quote = c; current += c; }
      else if (c === '|') { pieces.push(current); current = ''; }
      else if (';&<>'.includes(c)) return null;
      else current += c;
    }
    pieces.push(current);
    return pieces;
  }
  function read(absolute, command = 'cat') {
    if (denied(absolute)) return fail(command + ': ' + absolute + ': Permission denied');
    const item = node(absolute);
    if (!item) return fail(command + ': ' + absolute + ': No such file or directory');
    if (item.kind === 'dir') return fail(command + ': ' + absolute + ': Is a directory');
    if (item.kind !== 'file') return fail(command + ': ' + absolute + ': binary file' + (item.kind === 'image' ? '; type wagon to display the image' : ''));
    return ok(item.text);
  }
  function longLine(name, item) {
    const group = item.owner;
    return mode(item) + ' 1 ' + item.owner.padEnd(5) + ' ' + group.padEnd(5) + ' ' +
      String(size(item)).padStart(6) + ' Jan  1  1996 ' + name;
  }
  function ls(args) {
    const flags = args.filter((arg) => arg.startsWith('-')).join('');
    const targets = args.filter((arg) => !arg.startsWith('-'));
    const showAll = flags.includes('a'), long = flags.includes('l');
    const sections = [];
    for (const target of targets.length ? targets : ['.']) {
      const absolute = path(target);
      if (denied(absolute)) return fail('ls: ' + target + ': Permission denied');
      const item = node(absolute);
      if (!item) return fail("ls: cannot access '" + target + "': No such file or directory");
      let entries = item.kind === 'dir'
        ? Object.entries(item.entries).filter(([name]) => showAll || !name.startsWith('.')).sort(([a], [b]) => a.localeCompare(b))
        : [[absolute.split('/').pop(), item]];
      if (item.kind === 'dir' && showAll) entries = [['.', item], ['..', node(path(absolute + '/..'))], ...entries];
      const body = long ? entries.map(([name, entry]) => longLine(name, entry)).join('\n')
        : entries.map(([name, entry]) => name + (entry.kind === 'dir' ? '/' : '')).join('  ');
      sections.push((targets.length > 1 ? target + ':\n' : '') + (body || '(empty)'));
    }
    return ok(sections.join('\n\n'));
  }
  function tree(target, all) {
    const absolute = path(target || '.');
    if (denied(absolute)) return fail('tree: ' + absolute + ': Permission denied');
    const item = node(absolute);
    if (!item) return fail('tree: ' + absolute + ': No such file or directory');
    if (item.kind !== 'dir') return ok(absolute);
    const lines = [absolute];
    let dirs = 0, files = 0;
    function visit(current, here, prefix, depth) {
      if (depth > 7 || lines.length > 100) return;
      const entries = Object.entries(current.entries).filter(([name]) => all || !name.startsWith('.'))
        .sort(([a], [b]) => a.localeCompare(b));
      entries.forEach(([name, entry], index) => {
        const last = index === entries.length - 1;
        const childPath = (here === '/' ? '' : here) + '/' + name;
        lines.push(prefix + (last ? '└── ' : '├── ') + name + (entry.kind === 'dir' ? '/' : ''));
        if (entry.kind === 'dir') { dirs++; if (!denied(childPath)) visit(entry, childPath, prefix + (last ? '    ' : '│   '), depth + 1); }
        else files++;
      });
    }
    visit(item, absolute, '', 0);
    return ok(lines.join('\n') + '\n\n' + dirs + ' directories, ' + files + ' files');
  }
  function glob(pattern, name) {
    const escaped = pattern.replace(/\?/g, '\u0001').replace(/[|\\{}()[\]^$+.]/g, '\\$&').replace(/\*/g, '.*').replace(/\u0001/g, '.');
    return new RegExp('^' + escaped + '$').test(name);
  }
  function find(args) {
    const source = args[0] && !args[0].startsWith('-') ? path(args.shift()) : cwd;
    if (denied(source)) return fail('find: ' + source + ': Permission denied');
    const start = node(source);
    if (!start) return fail('find: ' + source + ': No such file or directory');
    let name = null, type = null, suid = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-name') name = args[++i];
      else if (args[i] === '-type') type = args[++i];
      else if (args[i] === '-perm' && args[i + 1] === '-4000') { suid = true; i++; }
      else return fail('find: unsupported predicate ' + args[i]);
    }
    if (name === undefined || (type && !['f', 'd'].includes(type))) return fail('find: invalid predicate');
    const found = [];
    function visit(here, item) {
      if (denied(here) || found.length >= 100) return;
      const basename = here.split('/').pop() || '/';
      const rightType = !type || (type === 'd' ? item.kind === 'dir' : item.kind !== 'dir');
      if (rightType && (!name || glob(name, basename)) && (!suid || item.suid)) found.push(here);
      if (item.kind === 'dir') for (const [childName, child] of Object.entries(item.entries))
        visit((here === '/' ? '' : here) + '/' + childName, child);
    }
    visit(source, start);
    return ok(found.join('\n') || '(no matches)');
  }
  function grep(args, stdin) {
    const insensitive = args.includes('-i'), numbered = args.includes('-n'), recursive = args.includes('-R') || args.includes('-r');
    const operands = args.filter((arg) => !['-i', '-n', '-R', '-r'].includes(arg));
    const needle = operands.shift();
    if (!needle) return fail('grep: missing pattern');
    const sources = [];
    if (operands.length) {
      for (const target of operands) {
        const absolute = path(target), item = node(absolute);
        if (denied(absolute)) return fail('grep: ' + absolute + ': Permission denied');
        if (!item) return fail('grep: ' + absolute + ': No such file or directory');
        if (item.kind === 'dir' && !recursive) return fail('grep: ' + absolute + ': Is a directory');
        function collect(here, entry) {
          if (denied(here)) return;
          if (entry.kind === 'file') sources.push([here, entry.text]);
          else if (entry.kind === 'dir') for (const [name, child] of Object.entries(entry.entries))
            collect((here === '/' ? '' : here) + '/' + name, child);
        }
        collect(absolute, item);
      }
    } else if (stdin !== null) sources.push(['', stdin]);
    else return fail('grep: missing file operand');
    const matches = [];
    for (const [source, content] of sources) content.split('\n').forEach((entry, index) => {
      const haystack = insensitive ? entry.toLowerCase() : entry;
      if (haystack.includes(insensitive ? needle.toLowerCase() : needle))
        matches.push((source && (recursive || sources.length > 1) ? source + ':' : '') + (numbered ? index + 1 + ':' : '') + entry);
    });
    return ok(matches.slice(0, 100).join('\n'));
  }
  function headTail(name, args, stdin) {
    let count = 10;
    const at = args.indexOf('-n');
    if (at >= 0) {
      count = Number(args[at + 1]); args.splice(at, 2);
      if (!Number.isInteger(count) || count < 0 || count > 100) return fail(name + ': invalid line count');
    }
    const source = args.length ? read(path(args[0]), name) : stdin !== null ? ok(stdin) : fail(name + ': missing file operand');
    if (source.error) return source;
    const lines = source.text.split('\n');
    return ok((count === 0 ? [] : name === 'head' ? lines.slice(0, count) : lines.slice(-count)).join('\n'));
  }
  function environment() {
    return `USER=${user}\nHOME=${home()}\nSHELL=/bin/sh\nHOSTNAME=warren\nTERM=bunny-256color\nPATH=/bin:/usr/bin`;
  }
  function dispatch(words, stdin = null) {
    const [command, ...parameters] = words;
    const args = [...parameters];
    const game = window.BunnyGames.run(command, args);
    if (game) return game;
    switch (command) {
      case 'pwd': return ok(cwd);
      case 'cd': {
        const destination = path(args[0] || '~');
        if (denied(destination)) return fail('sh: cd: ' + destination + ': Permission denied');
        const item = node(destination);
        if (!item) return fail('sh: cd: ' + destination + ': No such file or directory');
        if (item.kind !== 'dir') return fail('sh: cd: ' + destination + ': Not a directory');
        cwd = destination; return ok('');
      }
      case 'ls': case 'files': return ls(args);
      case 'cat': {
        if (!args.length) return stdin !== null ? ok(stdin) : fail('cat: missing file operand');
        const chunks = args.map((name) => read(path(name)));
        return chunks.find((item) => item.error) || ok(chunks.map((item) => item.text).join('\n'));
      }
      case 'head': case 'tail': return headTail(command, args, stdin);
      case 'tree': return tree(args.find((arg) => !arg.startsWith('-')), args.includes('-a'));
      case 'find': return find(args);
      case 'grep': return grep(args, stdin);
      case 'wc': {
        const source = args.includes('-l') ? args.find((arg) => arg !== '-l') : args[0];
        const content = source ? read(path(source), 'wc') : stdin !== null ? ok(stdin) : fail('wc: missing file operand');
        return content.error ? content : ok(String(content.text ? content.text.split('\n').length : 0) + (source ? ' ' + source : ''));
      }
      case 'file': {
        const target = path(args[0] || '.'), item = node(target);
        if (denied(target)) return fail('file: ' + target + ': Permission denied');
        if (!item) return fail('file: ' + target + ': No such file or directory');
        return ok((args[0] || '.') + ': ' + {dir: 'directory', file: 'ASCII text', image: 'PNG image data, 1774 x 887, pixel art', program: 'BunnyOS executable'}[item.kind]);
      }
      case 'stat': {
        const target = path(args[0] || '.'), item = node(target);
        if (denied(target)) return fail('stat: ' + target + ': Permission denied');
        if (!item) return fail('stat: ' + target + ': No such file or directory');
        return ok('  File: ' + target + '\n  Size: ' + size(item) + '\tType: ' + item.kind + '\nAccess: (' + mode(item) + ')  Uid: ' + item.owner + '  Gid: ' + item.owner);
      }
      case 'echo': {
        const vars = {HOME: home(), USER: user, SHELL: '/bin/sh', HOSTNAME: 'warren', PWD: cwd};
        return ok(args.join(' ').replace(/\$([A-Z_]+)/g, (_, key) => vars[key] ?? ''));
      }
      case 'whoami': return ok(user);
      case 'id': return user === 'guest' ? ok('uid=1000(guest) gid=1000(guest) groups=1000(guest),42(carrot)')
        : ok('uid=1001(bunny) gid=1001(bunny) groups=1001(bunny),42(carrot),10(wheel)');
      case 'groups': return ok(user === 'guest' ? 'guest carrot' : 'bunny carrot wheel');
      case 'su': {
        const target = args[0] || 'root';
        if (target === 'guest' && user === 'bunny') { user = 'guest'; cwd = home(); return ok(''); }
        if (target !== 'bunny') return fail('su: ' + target + ': Authentication failure');
        if (user === 'bunny') return ok('Already logged in as bunny.');
        awaitingPassword = true;
        return ok('Password:');
      }
      case 'exit': case 'logout': {
        if (user === 'guest') return ok('Already at guest shell.');
        user = 'guest'; cwd = home(); return ok('Logged out of bunny.');
      }
      case 'hostname': return ok('warren');
      case 'uname': return ok(args.includes('-a') ? 'Linux warren 6.6.6-bunny #1 SMP BunnyOS x86_64 GNU/BunnyOS' : args.includes('-r') ? '6.6.6-bunny' : 'Linux');
      case 'hostnamectl': return ok(' Static hostname: warren\n       Icon name: computer-bunny\n Operating System: BunnyOS 0.9 (The Warren)\n           Kernel: Linux 6.6.6-bunny\n     Architecture: x86_64');
      case 'lsb_release': return ok('Distributor ID:\tBunnyOS\nDescription:\tBunnyOS 0.9 (The Warren)\nRelease:\t0.9\nCodename:\tcarrot');
      case 'env': case 'printenv': return ok(args[0] ? environment().split('\n').find((entry) => entry.startsWith(args[0] + '='))?.split('=')[1] || '' : environment());
      case 'getent': return ['passwd', 'group'].includes(args[0]) ? read('/etc/' + args[0], 'getent') : fail('getent: unknown database');
      case 'which': {
        for (const base of ['/bin', '/usr/bin']) if (node(base + '/' + args[0])) return ok(base + '/' + args[0]);
        return fail((args[0] || '') + ' not found');
      }
      case 'ps': return ok('USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\nroot         1  0.0  0.1   4096  1024 ?        Ss   19:42   0:01 /sbin/init\nbunny       42  0.2  0.4   8192  2048 ?        S    19:42   0:03 /usr/sbin/wagond\nbunny     1978  0.0  0.2   4096  1024 ?        S    19:42   0:01 /usr/sbin/boardd\nroot      2600  0.0  0.2   4096  1024 ?        S    19:42   0:00 /usr/sbin/bunnyd\nguest     3133  0.0  0.1   2048   512 pts/0    R+   19:42   0:00 ps ' + args.join(' '));
      case 'ss': case 'netstat': return ok('Netid State  Recv-Q Send-Q Local Address:Port Peer Address:Port Process\nudp   UNCONN 0      0      127.0.0.1:2600     0.0.0.0:*       users:(("bunnyd",pid=2600))\ntcp   LISTEN 0      16     10.66.6.42:1978    0.0.0.0:*       users:(("boardd",pid=1978))');
      case 'ip': return ok(args[0] === 'route' ? 'default via 10.66.6.1 dev ear0\n10.66.6.0/24 dev ear0 proto kernel scope link src 10.66.6.42' : '1: lo: <LOOPBACK,UP> mtu 65536\n    inet 127.0.0.1/8 scope host lo\n2: ear0: <BROADCAST,MULTICAST,UP> mtu 1500\n    link/ether 02:42:ca:44:07:00\n    inet 10.66.6.42/24 brd 10.66.6.255 scope global ear0');
      case 'ifconfig': return ok('ear0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n        inet 10.66.6.42  netmask 255.255.255.0\nlo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536\n        inet 127.0.0.1  netmask 255.0.0.0');
      case 'route': return ok('Kernel IP routing table\nDestination     Gateway         Genmask         Flags Iface\n0.0.0.0         10.66.6.1       0.0.0.0         UG    ear0\n10.66.6.0       0.0.0.0         255.255.255.0   U     ear0');
      case 'arp': return ok('? (10.66.6.1) at 02:42:ca:44:07:01 [ether] on ear0');
      case 'df': return ok('Filesystem       Size  Used Avail Use% Mounted on\n/dev/wagon0      1.4G  420M  980M  30% /\ntmpfs             64M     0   64M   0% /tmp');
      case 'free': return ok('               total        used        free      shared  buff/cache   available\nMem:           640Ki       256Ki       256Ki         0Ki       128Ki       384Ki\nSwap:             0B          0B          0B');
      case 'lsblk': return ok('NAME    MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS\nwagon0    8:0    0  1.4G  0 disk /\ncarrot1   8:1    1   64M  0 disk /mnt/carrot');
      case 'mount': return ok('/dev/wagon0 on / type ext4 (rw,relatime)\ntmpfs on /tmp type tmpfs (rw,nosuid,nodev)\n/dev/carrot1 on /mnt/carrot type carrotfs (ro)');
      case 'lsof': return ok('COMMAND  PID USER  FD  TYPE DEVICE NAME\nbunnyd  2600 root   3u  IPv4  2600  UDP 127.0.0.1:2600\nboardd  1978 bunny  4u  IPv4  1978  TCP 10.66.6.42:1978 (LISTEN)');
      case 'who': return ok(user + '    pts/0        Jan  1 19:42 (ear0)');
      case 'crontab': return args[0] === '-l' ? ok('17 2 * * * /usr/bin/carrot --water\n@reboot /usr/sbin/wagond --follow-trail') : fail('crontab: use -l to list jobs');
      case 'sudo': return args[0] === '-l' ? ok('Matching Defaults entries for guest on warren:\n    env_reset, secure_path=/bin:/usr/bin\nUser guest may run the following commands on warren:\n    (root) NOPASSWD: /usr/bin/carrot') : args[0] === '/usr/bin/carrot' ? ok('CARROT ACQUIRED. The bunny approves.') : fail('sudo: guest is not allowed to run that command');
      case 'systemctl': return args[0] === 'status' && args[1] ? ok('● ' + args[1] + ' - BunnyOS service\n   Loaded: loaded\n   Active: active (running) since Jan 01 1996') : ok('UNIT             LOAD   ACTIVE SUB     DESCRIPTION\nbunnyd.service   loaded active running Bunny signal daemon\nwagond.service   loaded active running Wagon trail service\nboardd.service   loaded active running Night board');
      case 'last': return ok('guest    pts/0        ear0             Jan  1 19:42   still logged in\nbunny    tty1         wagon            Jan  1 19:36 - 19:40');
      case 'lscpu': return ok('Architecture: x86_64\nCPU(s): 1\nModel name: CarrotCore 486DX\nBogoMIPS: 42.00');
      case 'uptime': return ok('up 1 day, 1 user, load average: 0.01, 0.01, 0.00');
      default: return null;
    }
  }
  function run(raw) {
    if (awaitingPassword) return fail('su: password required');
    const pieces = splitPipes(raw);
    if (!pieces) return fail('shell operators are not available in this terminal');
    const stages = pieces.map((piece) => tokenize(piece.trim()));
    if (stages.some((stage) => !stage || !stage.length)) return fail('shell: unterminated quote or empty pipe');
    if (!known.includes(stages[0][0])) return null;
    let response = dispatch(stages[0]);
    for (const stage of stages.slice(1)) {
      if (response.error) break;
      if (!['grep', 'head', 'tail', 'wc', 'cat'].includes(stage[0])) return fail('pipe: only grep, head, tail, wc, and cat are available');
      response = dispatch(stage, response.text);
    }
    return response;
  }
  function complete(typed) {
    const segmentStart = typed.lastIndexOf('|') + 1;
    const segment = typed.slice(segmentStart);
    const tokenStart = typed.length - (segment.match(/[^\s]*$/)?.[0].length ?? 0);
    const before = typed.slice(0, tokenStart);
    const fragment = typed.slice(tokenStart);
    if (!before.slice(segmentStart).trim()) {
      return known.filter((command) => command.startsWith(fragment)).map((command) => before + command);
    }
    if (fragment.startsWith('-')) return [];
    if (fragment === '~') return [before + '~/'];
    const slash = fragment.lastIndexOf('/');
    const directoryPart = slash < 0 ? '' : fragment.slice(0, slash + 1);
    const partialName = fragment.slice(slash + 1);
    const absoluteDirectory = path(directoryPart || '.');
    if (denied(absoluteDirectory)) return [];
    const parent = node(absoluteDirectory);
    if (!parent || parent.kind !== 'dir') return [];
    const command = before.slice(segmentStart).trimStart().split(/\s+/)[0];
    return Object.entries(parent.entries)
      .filter(([name, item]) => name.startsWith(partialName) &&
        (partialName.startsWith('.') || !name.startsWith('.')) &&
        (command !== 'cd' || item.kind === 'dir') &&
        !denied(path(directoryPart + name)))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, item]) => before + directoryPart + name + (item.kind === 'dir' ? '/' : ''));
  }
  return {run, reset, prompt, complete, isAwaitingPassword, cancelPassword, authenticate};
})();
