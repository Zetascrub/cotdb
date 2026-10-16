// Edit this tree to add virtual directories and files. This is display data only:
// the browser never reads the visitor's real filesystem or runs OS commands.
const directory = (entries, owner = 'root') => ({kind: 'dir', entries, owner});
const textFile = (text, owner = 'root') => ({kind: 'file', text, owner});
const imageFile = (src, owner = 'guest') => ({kind: 'image', src, owner});
const program = (owner = 'root', suid = false) => ({kind: 'program', owner, suid});

window.COTDB_FS = directory({
  bin: directory({
    cat: program(), ls: program(), sh: program(), echo: program(), bunny: program()
  }),
  dev: directory({
    wagon0: program(), carrot1: program()
  }),
  etc: directory({
    'os-release': textFile('NAME="BunnyOS"\nVERSION="0.9 (The Warren)"\nID=bunnyos\nPRETTY_NAME="BunnyOS 0.9 — The Warren"'),
    hostname: textFile('warren'),
    issue: textFile('BunnyOS 0.9 \\n \\l'),
    motd: textFile('Welcome to the warren. Mind the wagon.'),
    passwd: textFile('root:x:0:0:Keeper of Carrots:/root:/bin/sh\nguest:x:1000:1000:Trail Visitor:/home/guest:/bin/sh\nbunny:x:1001:1001:Wagon Driver:/home/bunny:/bin/sh'),
    group: textFile('root:x:0:\nwheel:x:10:bunny\ncarrot:x:42:guest,bunny\nguest:x:1000:guest\nbunny:x:1001:bunny')
  }),
  home: directory({
    guest: directory({
      'readme.txt': textFile('COTDB / CULT OF THE DEAD BUNNIES\nA small terminal on the edge of the old web.\nTry: ls, cd notes, map, or travel.', 'guest'),
      'manifesto.txt': textFile('01. Stay curious.\n02. Take things apart to understand them.\n03. Leave a trail for the next person.\n04. Feed the bunny.', 'guest'),
      'fieldnotes.txt': textFile('The wagon is packed. The road ahead is mostly static.\nSomewhere past the crossing, a signal keeps repeating: 2600.', 'guest'),
      'wagon.png': imageFile('assets/bunny-wagon-v2.png'),
      notes: directory({
        'board.txt': textFile('BBS NOTE 001\nThe board is quiet tonight. Someone left a path in /var/log/warren.log.', 'guest'),
        'dialtone.txt': textFile('You hear a dial tone. Then a click. Then the bunny hangs up.', 'guest')
      }, 'guest'),
      trail: directory({
        'map.txt': textFile('CAMP -- PAYPHONE -- CROSSING -- NIGHT BOARD -- WARREN', 'guest'),
        'supplies.txt': textFile('1 wagon\n1 determined bunny\n0 spare horses\nEnough carrots, probably', 'guest')
      }, 'guest'),
      '.bash_history': textFile('ls -la\ncat /etc/os-release\nfind /home/guest -name "*.txt"\ntravel', 'guest')
    }, 'guest'),
    bunny: directory({
      'todo.txt': textFile('Pull wagon. Check river. Find carrots.', 'bunny')
    }, 'bunny')
  }),
  mnt: directory({
    carrot: directory({
      'label.txt': textFile('CARROTFS / read-only / do not nibble the filesystem')
    })
  }),
  proc: directory({
    version: textFile('Linux version 6.6.6-bunny (root@warren) #1 SMP BunnyOS x86_64'),
    cpuinfo: textFile('processor\t: 0\nmodel name\t: CarrotCore 486DX\ncache size\t: 64 KB\nbogomips\t: 42.00')
  }),
  root: directory({
    'flag.txt': textFile('Nice try. The real treasure was the carrots along the way.')
  }),
  sbin: directory({init: program()}),
  tmp: directory({}),
  usr: directory({
    bin: directory({
      carrot: program('root', true),
      nmap: program(),
      vim: program()
    }),
    sbin: directory({
      bunnyd: program(), wagond: program(), boardd: program()
    }),
    share: directory({
      cotdb: directory({
        'welcome.txt': textFile('Cult of the Dead Bunnies // follow the trail.')
      })
    })
  }),
  var: directory({
    log: directory({
      'boot.log': textFile('[  OK  ] Mounted /warren\n[  OK  ] Started bunnyd.service\n[  OK  ] Reached terminal.target'),
      'auth.log': textFile('Jan 01 19:42:06 warren sudo: guest : command denied : /usr/bin/carrot'),
      'warren.log': textFile('The night board hums. The signal is 2600. The wagon is still moving.')
    })
  })
});
