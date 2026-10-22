import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { KitData } from './buildSeed';

export const KIT_DATA_DIR = resolve(import.meta.dirname, '../../kit/data');

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(KIT_DATA_DIR, name), 'utf8')) as T;
}

export function loadKit(): KitData {
  return {
    foods: readJson('foods.json'),
    menuTemplate: readJson('menu-template.json'),
    specialDinner: readJson('special-dinner.json'),
    rotations: readJson('rotations.json'),
  };
}
