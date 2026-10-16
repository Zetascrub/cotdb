# Cult of the Dead Bunnies

A small terminal-themed site built around a completed bunny-and-wagon pixel-art image inspired by the supplied reference. It runs a brief boot sequence, then opens an interactive command prompt with quick commands and hidden responses. It uses plain HTML, CSS, and JavaScript; there is no build step or backend.

## Run locally

From this directory:

```sh
python3 -m http.server 8000 -d dist
```

Open `http://localhost:8000`. The terminal is a local, playful command prompt. It does not execute system commands or send input anywhere. Use Up and Down to revisit commands, or Ctrl+L to clear the output.

The supplied `Group Logo - Inspiration.jpg` is retained at the project root. The finished image used by the site is `dist/assets/bunny-wagon-v2.png`.
