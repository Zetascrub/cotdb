# Cult of the Dead Bunnies

A small terminal-themed site built around a completed bunny-and-wagon pixel-art image inspired by the supplied reference. It runs a boot sequence, then opens a Linux-like virtual shell with directories, files, a short wagon trail, and hidden responses. It uses plain HTML, CSS, and JavaScript; there is no build step or backend.

## Run locally

From this directory:

```sh
python3 -m http.server 8000 -d dist
```

Open `http://localhost:8000`. The terminal is a local, playful command prompt. It does not execute system commands or send input anywhere. Type `help` for public commands. Use Up and Down to revisit commands, Tab to complete one, or Ctrl+L to clear the output. `reboot` resets the trail and returns to `/home/guest`.

## Edit the virtual filesystem

Edit [dist/filesystem.js](dist/filesystem.js). Add directories with `directory({...})`, text files with `textFile('content', 'guest')`, and image entries with `imageFile('assets/name.png')`. The second argument on directories and text files is the displayed owner; it defaults to `root`. Put any image asset in `dist/assets/` and add its entry to the tree.

For example, inside `/home/guest`:

```js
projects: directory({
  'hello.txt': textFile('Hello from the warren.', 'guest')
}, 'guest')
```

The command behavior and fictional system responses are in [dist/shell.js](dist/shell.js). The boot, wagon trail, quick press buttons, and terminal UI are in [dist/script.js](dist/script.js). Commands such as `uname -a`, `ps aux`, and `sudo -l` return made-up BunnyOS data; they never inspect the visitor's device.

The supplied `Group Logo - Inspiration.jpg` is retained at the project root. The finished image used by the site is `dist/assets/bunny-wagon-v2.png`.

Run the virtual shell checks with `node --test tests/shell.test.cjs`.
