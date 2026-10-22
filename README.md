# Cult of the Dead Bunnies

A small terminal-themed site built around a completed bunny-and-wagon pixel-art image inspired by the supplied reference. It runs a boot sequence, then opens a Linux-like virtual shell with directories, files, a short wagon trail, and hidden responses. It uses plain HTML, CSS, and JavaScript; there is no build step or backend.

## Run locally

From this directory:

```sh
python3 -m http.server 8000 -d dist
```

Open `http://localhost:8000`. Choose whether to enable SFX, then click **Boot**. The terminal is a local, playful command prompt. It does not execute system commands or send input anywhere. Type `help` for public commands. Use Up and Down to revisit commands, Tab to complete commands and virtual paths, or Ctrl+L to clear the output. For example, `cat /var/lo` completes to `cat /var/log/`; another Tab after typing `wa` completes `warren.log`. `reboot` resets the trail and returns to `/home/guest` through BIOS and the boot log. `poweroff` returns to the Boot screen and clears the session.

Sound starts off. Click **SFX OFF** in the header to enable quiet synthesized connection, typing, command, error, boot, and game-win cues. The toggle lasts for the current page session; password keystrokes stay silent. Edit [dist/audio.js](dist/audio.js) to adjust tones and volume.

After Boot, startup shows a WarrenWare BIOS screen, then the boot log. Press F12 (or click its prompt) during the BIOS screen to choose a boot device; Esc continues. With SFX enabled, a quiet synthesized drive hum and disk clicks play during startup and stop at the login prompt. `reboot` repeats that sequence directly; `poweroff` returns to the power screen with SFX still set as chosen.

Edit `bootLines` near the top of [dist/script.js](dist/script.js) to change the boot log. Write status rows as `['CHECKING MEMORY, 640K OK', 230]`: the text before the comma stays in the left column, and the result aligns in the right column. Lines without a comma span the row. A result containing `FAILED` plays a short failure cue when SFX is on.

## Edit the virtual filesystem

Edit [dist/filesystem.js](dist/filesystem.js). Add directories with `directory({...})`, text files with `textFile('content', 'guest')`, and image entries with `imageFile('assets/name.png')`. The second argument on directories and text files is the displayed owner; it defaults to `root`. An image entry shows up in `ls`, `tree`, `file`, and `stat` as a PNG; the site renders only its hero image (`wagon.png`), via the `wagon` command. Making a newly added image display on screen would need a code change.

For example, inside `/home/guest`:

```js
projects: directory({
  'hello.txt': textFile('Hello from the warren.', 'guest')
}, 'guest')
```

The command behavior and fictional system responses are in [dist/shell.js](dist/shell.js). The boot, wagon trail, quick press buttons, and terminal UI are in [dist/script.js](dist/script.js). Commands such as `uname -a`, `ps aux`, and `sudo -l` return made-up BunnyOS data; they never inspect the visitor's device.

## CTF route and games

Type `games` to see the available games. `trail` (also `travel`) starts the wagon journey; enter the displayed `trail <choice>` commands to cross each leg. Reaching the warren reveals Bunny's bcrypt password hash. Crack it on your own system, then type `su bunny` and enter the password. The terminal hides password input and does not add it to command history. On a correct password the flag is decrypted in the browser and `/home/bunny/Flag.txt` reads it out; `exit` returns to guest. `reboot` resets the login and game state. `guess` and `rps` are short side games.

There is a second route to the password: a hidden `.whisper` file in `/home/guest` holds an encoded clue (ROT13, then base64). `ls -la`, `find`, or `grep` turns it up; undoing both steps gives the password without cracking the hash. Remove the file if you want the hash crack to be the only way in.

The cult arcade adds `wopr` (a grid duel against the bunny), `sneakers` (three anagrams), and `bbs` (a bulletin-board door puzzle). Each command starts its game and prints the next valid moves. `wopr restart`, `sneakers restart`, and `bbs reset` start fresh rounds. These games are separate from the trail hash route.

The fictional bug report at `/var/log/tickets.log` hints at the Trail hash leak. `/var/log/warren.log` points to it.

The hash and the sealed flag are both in [dist/games.js](dist/games.js): `bunnyHash` is the bcrypt hash, and `flagBlob` is the flag encrypted with the password (AES-GCM, key derived with PBKDF2). The flag plaintext does not ship, so viewing source no longer reveals it; `/home/bunny/Flag.txt` holds only a placeholder until `su bunny` decrypts the flag into it. This still runs entirely in the browser, so the hash, the ciphertext, and the base64 clue can all be inspected — the point is that reading the flag now takes work (crack the hash, or decode the clue) instead of a glance. Use a server-backed challenge if the flag must stay secret until authentication; do not use a real account password here.

To change the password or flag, run `node scripts/seal-flag.mjs '<password>' '<flag>'`, paste the printed string into `flagBlob` in `dist/games.js`, update `bunnyHash` to a bcrypt hash of the new password, and update the base64 in `.whisper` (`dist/filesystem.js`) to match. Keep the real password out of the repo; `CTF_SPOILERS.local.md` is git-ignored for that.

To change the quote shown under the welcome text, edit the `quotes` array near the top of [dist/script.js](dist/script.js). Write each entry as `Quote - Author`. One entry is picked at random on each boot, including `reboot`.

The supplied `Group Logo - Inspiration.jpg` is retained at the project root. The finished image used by the site is `dist/assets/bunny-wagon-v2.png`.

Run the virtual shell checks with `node --test tests/shell.test.cjs`.
