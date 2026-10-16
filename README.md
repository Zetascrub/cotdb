# Cult of the Dead Bunnies

A small terminal-themed site built around a completed bunny-and-wagon pixel-art image inspired by the supplied reference. It runs a boot sequence, then opens an interactive command prompt with quick commands, readable virtual files, a short wagon trail, and hidden responses. It uses plain HTML, CSS, and JavaScript; there is no build step or backend.

## Run locally

From this directory:

```sh
python3 -m http.server 8000 -d dist
```

Open `http://localhost:8000`. The terminal is a local, playful command prompt. It does not execute system commands or send input anywhere. Type `help` for commands. Use Up and Down to revisit commands, Tab to complete one, or Ctrl+L to clear the output. `reboot` resets the trail.

The supplied `Group Logo - Inspiration.jpg` is retained at the project root. The finished image used by the site is `dist/assets/bunny-wagon-v2.png`.
