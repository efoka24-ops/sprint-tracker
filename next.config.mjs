import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
export default {
  // Le dossier parent (~) contient un package-lock.json : sans cela Next infère
  // une racine de workspace erronée et le build échoue sur /_document.
  outputFileTracingRoot: racine,
  // Windows : les workers parallèles de la collecte de pages échouent aléatoirement
  // (« Cannot find module for page »). Un seul worker rend le build déterministe.
  experimental: { workerThreads: false, cpus: 1 },
};
