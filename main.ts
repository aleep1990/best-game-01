// STARSHATTER — the best-game-01 entry program (Node 22, standard library only).
//
// What it does: takes the game in this repository's game/ folder — plain static
// files a desktop browser loads offline (game/index.html plus its ES modules,
// no library, no network request) — and hands it in. It copies game/ and
// screenshots/ into the output directory and writes /output/dossier.json, the
// summary the judge reads, using the vendored make.fun library.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the game locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's own caps: only text_max_bytes shapes the bytes; the rest refuse
// an entry the scorer would refuse (more than 4 screenshots or one over 256 KiB;
// more than 993 files in game/ or 48 MiB of game files in all; a path under
// game/ over 1000 bytes).
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function handIn(repoDir, outDir) {
  mkdirSync(outDir, { recursive: true });
  cpSync(join(repoDir, 'game'), join(outDir, 'game'), { recursive: true });
  const shotsDir = join(outDir, 'screenshots');
  mkdirSync(shotsDir, { recursive: true });
  const shots = join(repoDir, 'screenshots');
  if (existsSync(shots)) cpSync(shots, shotsDir, { recursive: true });
  writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, CAPS));
}

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
handIn(repoDir, outDir);
