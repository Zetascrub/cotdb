// Fictional terminal games. This is a browser puzzle, not a secure filesystem.
window.BunnyGames = (() => {
  // Bunny's bcrypt hash. Keep this and the authentication check in sync.
  const bunnyHash = '$2a$12$HrnmCRhtMtdf6CPsLC.9LeT5eruGpal6CHBQoyiF0qd80P4SGfBdO';
  // Flag sealed with the bunny password (AES-GCM; see scripts/seal-flag.mjs).
  // Only this ciphertext ships; cracking the hash yields the password that decrypts it.
  const flagBlob = 'n4tSj+zLtGlVVRBysTdwH3RRtghad+sCQZZV40oGYBiAB2gJ1JOsLTbR9WBfayD2dQMAT+oowszKcXQKnMmi2oKqVxOl';
  const legs = [
    {name: 'CAMP', scene: 'Your wagon is packed at the edge of the warren.', choices: {
      pack: {carrots: 2, wagon: 0, text: 'You tuck extra carrots under the canvas.'},
      scout: {carrots: 0, wagon: 1, text: 'You reinforce the wheels before leaving.'}
    }},
    {name: 'RIVER CROSSING', scene: 'The river is up. The bunny eyes the far bank.', choices: {
      ford: {carrots: 0, wagon: -1, text: 'The wagon bumps over the riverbed.'},
      ferry: {carrots: -2, wagon: 0, text: 'The ferryman takes two carrots.'}
    }},
    {name: 'PRAIRIE', scene: 'A long dry stretch lies ahead.', choices: {
      hunt: {carrots: 2, wagon: -1, text: 'You find food, but a wheel takes a hit.'},
      push: {carrots: 0, wagon: 0, text: 'You keep moving through the heat.'}
    }},
    {name: 'MOUNTAIN PASS', scene: 'The final climb is steep and the wagon creaks.', choices: {
      rest: {carrots: -1, wagon: 1, text: 'A meal and a repair make the climb easier.'},
      climb: {carrots: 0, wagon: -2, text: 'You race up the rocky path.'}
    }}
  ];
  let trail = null;
  let guess = null;
  let wopr = null;
  let sneakers = null;
  let bbs = null;

  const ok = (text, sound) => ({text, error: false, sound});
  const fail = (text) => ({text, error: true});
  const supplyLine = () => `Carrots: ${trail.carrots} | Wagon: ${trail.wagon}/4`;
  const scene = () => {
    const leg = legs[trail.leg];
    return `${leg.name}: ${leg.scene}\n${supplyLine()}\nChoose: ${Object.keys(leg.choices).map((choice) => `trail ${choice}`).join(' / ')}`;
  };
  function startTrail() {
    trail = {leg: 0, carrots: 3, wagon: 3, result: null};
    return ok('THE WAGON TRAIL // Reach the warren with food and a working wagon.\nEach leg uses one carrot.\n' + scene());
  }
  function trailCommand(args) {
    if (args[0] === 'restart') return startTrail();
    if (!trail) return args.length ? fail('trail: start the game with trail') : startTrail();
    if (trail.result === 'lost') return ok('The wagon did not make it. Type trail restart to try again.');
    if (trail.result === 'won') return ok(`The warren is yours. Bunny password hash (bcrypt):\n${bunnyHash}\nCrack it on your own system, then type su bunny.`);
    if (!args.length || args[0] === 'status') return ok(scene());
    const choice = legs[trail.leg].choices[args[0]];
    if (!choice) return fail(`trail: choose ${Object.keys(legs[trail.leg].choices).join(' or ')}`);
    trail.carrots += choice.carrots - 1;
    trail.wagon = Math.min(4, trail.wagon + choice.wagon);
    const outcome = choice.text + '\n' + supplyLine();
    if (trail.carrots < 0 || trail.wagon <= 0) {
      trail.result = 'lost';
      return ok(outcome + '\nThe wagon cannot go on. Type trail restart to try again.');
    }
    trail.leg++;
    if (trail.leg === legs.length) {
      trail.result = 'won';
      return ok(outcome + `\nThe bunny reaches the warren! Bunny password hash (bcrypt):\n${bunnyHash}\nCrack it on your own system, then type su bunny.`, 'success');
    }
    return ok(outcome + '\n\n' + scene());
  }
  function guessCommand(args) {
    if (!guess || args[0] === 'restart') {
      guess = {number: Math.floor(Math.random() * 10) + 1, turns: 0};
      return ok('GUESS THE FREQUENCY // Pick a number from 1 to 10. Five tries. Type guess <number>.');
    }
    if (!args.length) return ok(`Guess a number from 1 to 10. ${5 - guess.turns} tries left.`);
    const number = Number(args[0]);
    if (!Number.isInteger(number) || number < 1 || number > 10) return fail('guess: enter a whole number from 1 to 10');
    guess.turns++;
    if (number === guess.number) {
      guess = null;
      return ok('Frequency locked. You win! Type guess to play again.', 'success');
    }
    const hint = number < guess.number ? 'Higher.' : 'Lower.';
    if (guess.turns === 5) {
      const answer = guess.number;
      guess = null;
      return ok(`${hint} Out of tries. The frequency was ${answer}. Type guess to play again.`);
    }
    return ok(`${hint} ${5 - guess.turns} tries left.`);
  }
  function rpsCommand(args) {
    const choices = ['rock', 'paper', 'scissors'];
    if (!args.length) return ok('ROCK / PAPER / SCISSORS // Type rps rock, rps paper, or rps scissors.');
    if (!choices.includes(args[0])) return fail('rps: choose rock, paper, or scissors');
    const bunny = choices[Math.floor(Math.random() * choices.length)];
    const result = args[0] === bunny ? 'Draw.' :
      (choices.indexOf(args[0]) + 2) % 3 === choices.indexOf(bunny) ? 'You win!' : 'The bunny wins.';
    return ok(`You: ${args[0]} | Bunny: ${bunny} | ${result}`, result === 'You win!' ? 'success' : undefined);
  }
  const winningLines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  const hasLine = (board, mark) => winningLines.some((line) => line.every((cell) => board[cell] === mark));
  const openCells = (board) => board.map((cell, index) => cell ? null : index).filter((cell) => cell !== null);
  function grid(board) {
    const cell = (index) => board[index] || String(index + 1);
    return ` ${cell(0)} | ${cell(1)} | ${cell(2)}\n---+---+---\n ${cell(3)} | ${cell(4)} | ${cell(5)}\n---+---+---\n ${cell(6)} | ${cell(7)} | ${cell(8)}`;
  }
  function winningMove(board, mark) {
    return openCells(board).find((cell) => {
      board[cell] = mark;
      const wins = hasLine(board, mark);
      board[cell] = '';
      return wins;
    });
  }
  function woprCommand(args) {
    if (!wopr || args[0] === 'restart') {
      wopr = {board: Array(9).fill(''), ended: false};
      return ok('W.O.P.R. // Warren Operations & Playful Rabbits\nYou are X. The bunny is O. Type wopr <1-9>.\n' + grid(wopr.board));
    }
    if (!args.length || args[0] === 'board') return ok(grid(wopr.board) + (wopr.ended ? '\nType wopr restart for another round.' : '\nChoose: wopr <1-9>'));
    if (wopr.ended) return fail('wopr: game over; type wopr restart');
    const cell = Number(args[0]) - 1;
    if (!Number.isInteger(cell) || cell < 0 || cell > 8) return fail('wopr: choose a square from 1 to 9');
    if (wopr.board[cell]) return fail('wopr: that square is occupied');
    wopr.board[cell] = 'X';
    if (hasLine(wopr.board, 'X')) { wopr.ended = true; return ok(grid(wopr.board) + '\nYou outplayed the bunny. The carrots are yours.', 'success'); }
    if (!openCells(wopr.board).length) { wopr.ended = true; return ok(grid(wopr.board) + '\nDraw. No carrots were harmed.'); }
    const options = openCells(wopr.board);
    const bunnyMove = winningMove(wopr.board, 'O') ?? winningMove(wopr.board, 'X') ??
      (wopr.board[4] ? null : 4) ?? options[Math.floor(Math.random() * options.length)];
    wopr.board[bunnyMove] = 'O';
    if (hasLine(wopr.board, 'O')) { wopr.ended = true; return ok(grid(wopr.board) + `\nThe bunny chose ${bunnyMove + 1} and won. Type wopr restart.`); }
    if (!openCells(wopr.board).length) { wopr.ended = true; return ok(grid(wopr.board) + '\nDraw. No carrots were harmed.'); }
    return ok(grid(wopr.board) + `\nThe bunny chose ${bunnyMove + 1}. Your move: wopr <1-9>`);
  }
  const anagrams = [
    {scramble: 'BIBRAT ELOH', clue: 'Where a curious hacker goes.', answer: 'rabbit hole'},
    {scramble: 'LIAD ENOT', clue: 'What the old modem heard first.', answer: 'dial tone'},
    {scramble: 'DDEA YNNUB', clue: 'A member of this very odd cult.', answer: 'dead bunny'}
  ];
  function sneakersCommand(args) {
    if (sneakers === null || args[0] === 'restart') {
      sneakers = 0;
      return ok('SNEAKERS // Anagram desk. Unscramble three phrases.\n' + anagramPrompt());
    }
    if (!args.length || args[0] === 'clue') return ok(anagramPrompt());
    const answer = args.join(' ').toLowerCase();
    if (answer !== anagrams[sneakers].answer) return fail('sneakers: not quite. Type sneakers clue to see the letters again.');
    sneakers++;
    if (sneakers === anagrams.length) {
      sneakers = null;
      return ok('All three phrases recovered. The bunny slides you a blank floppy disk. Type sneakers to play again.', 'success');
    }
    return ok('Correct.\n' + anagramPrompt());
  }
  function anagramPrompt() {
    const puzzle = anagrams[sneakers];
    return `${sneakers + 1}/${anagrams.length}  ${puzzle.scramble}\nClue: ${puzzle.clue}\nAnswer with sneakers <phrase>.`;
  }
  function bbsCommand(args) {
    if (!bbs || args[0] === 'reset') {
      bbs = {messages: false, files: false, unlocked: false};
      return ok('WARREN BBS // CONNECTED AT 2400 BAUD\nExplore: bbs messages / bbs files / bbs door');
    }
    if (!args.length) return ok('WARREN BBS // ' + (bbs.unlocked ? 'DOOR OPEN' : 'ONLINE') + '\nExplore: bbs messages / bbs files / bbs door');
    if (args[0] === 'messages') {
      bbs.messages = true;
      return ok('SYSOP NOTE: The door code is the number the dial-tone ghosts keep repeating: 2600.');
    }
    if (args[0] === 'files') {
      bbs.files = true;
      return ok('FILES: rabbit.txt  wagon.map  night-board.nfo\nThe NFO says: read the messages, check the files, then try the door.');
    }
    if (args[0] === 'door') {
      if (bbs.unlocked) return ok('The BBS door is open. A pixel bunny waves from the other side.');
      if (!bbs.messages || !bbs.files) return fail('BBS DOOR: explore messages and files before trying the door.');
      if (!args[1]) return ok('BBS DOOR: access code required. Type bbs door <code>.');
      if (args[1] !== '2600') return fail('BBS DOOR: bad code. The bunny hangs up.');
      bbs.unlocked = true;
      return ok('ACCESS GRANTED // A pixel bunny waves from the other side. Welcome to the late-night board.', 'success');
    }
    return fail('bbs: try messages, files, or door');
  }
  function run(command, args) {
    if (command === 'games') return ok('GAMES // trail (or travel): wagon journey and CTF clue\nguess: guess the frequency\nrps: rock / paper / scissors\nwopr: grid duel against the bunny\nsneakers: anagram desk\nbbs: late-night bulletin board door');
    if (command === 'trail' || command === 'travel') return trailCommand(args);
    if (command === 'guess') return guessCommand(args);
    if (command === 'rps') return rpsCommand(args);
    if (command === 'wopr') return woprCommand(args);
    if (command === 'sneakers') return sneakersCommand(args);
    if (command === 'bbs') return bbsCommand(args);
    if (command === 'map') return ok(legs.map((leg, index) => `${trail && index === trail.leg && !trail.result ? '>' : ' '} ${index + 1}. ${leg.name}`).join(' -- '));
    if (command === 'look') return trail && !trail.result ? ok(scene()) : ok('The wagon is waiting. Type trail to set out.');
    return null;
  }
  function reset() { trail = null; guess = null; wopr = null; sneakers = null; bbs = null; }
  function status() { return trail ? `trail ${trail.result || `${trail.leg + 1}/${legs.length}`} · ${supplyLine()}` : 'trail not started'; }
  return Object.freeze({run, reset, status, passwordHash: bunnyHash, flagBlob});
})();
