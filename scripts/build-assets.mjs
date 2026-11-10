// Сборка ассетов из art-src/ в public/assets/. Запуск: npm run assets — после каждого изменения арта.
// 1. Символы пакуются в атлас: art-src/symbols/*.png → symbols.{png,json}.
// 2. Крупные одиночные картинки копируются как есть (в атласе им не место: большие, рисуются по одной).

import { copyFileSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { packAsync } from 'free-tex-packer-core';
import { buildAtlas, buildSymbolSkeleton } from './spine/symbolSpine.mjs';

const SRC = 'art-src/symbols';
const OUT = 'public/assets';

const images = readdirSync(SRC)
    .filter((f) => f.endsWith('.png'))
    .map((f) => ({ path: f, contents: readFileSync(join(SRC, f)) }));

const files = await packAsync(images, {
    textureName: 'symbols',
    exporter: 'Pixi',            // JSON Hash — формат, который понимает загрузчик spritesheet в Pixi
    removeFileExtension: true,   // кадр «ace», а не «ace.png» — совпадает с SymbolId в gameConfig
    prependFolderName: false,
    scale: 0.5,                  // исходники 512², в игре символ ~180 px — 256² хватает с запасом
    width: 2048,
    height: 2048,
    powerOfTwo: true,
    // padding/extrude чётные и trim выключен: координаты считаются в исходном размере и потом
    // умножаются на scale, а нечётные числа × 0.5 дают дробные пиксели и артефакты по краям кадров.
    padding: 4,                  // зазор между кадрами
    extrude: 2,                  // дублирует крайние пиксели — без «просачивания» соседей при фильтрации
    allowRotation: false,        // не поворачивать кадры: проще отлаживать
    allowTrim: false,
    detectIdentical: true,
    packer: 'OptimalPacker',
});

mkdirSync(OUT, { recursive: true });
for (const file of files) {
    writeFileSync(join(OUT, file.name), file.buffer);
    console.log('written', join(OUT, file.name));
}

// 3. Spine: .atlas поверх symbols.png и скелет символов (скин на каждый символ). См. scripts/spine/symbolSpine.mjs.
const sheetFile = files.find((f) => f.name.endsWith('.json'));
const sheet = JSON.parse(sheetFile.buffer.toString('utf-8'));
const symbolIds = Object.keys(sheet.frames);
const frameSize = sheet.frames[symbolIds[0]].frame.w;

writeFileSync(join(OUT, 'symbols.atlas'), buildAtlas(sheet));
console.log('written', join(OUT, 'symbols.atlas'));
mkdirSync(join(OUT, 'spine'), { recursive: true });
writeFileSync(join(OUT, 'spine/symbol.json'), JSON.stringify(buildSymbolSkeleton(symbolIds, frameSize), null, 2));
console.log('written', join(OUT, 'spine/symbol.json'));

/** Одиночные файлы: путь в art-src → путь в public/assets (его же пишем в манифест). */
const SINGLE_FILES = [
    'background/bg_landscape.jpg',
    'reels/frame.png',
    'reels/reels_bg.png',
    'ui/logo.png',
];

for (const file of SINGLE_FILES) {
    const target = join(OUT, file);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join('art-src', file), target);
    console.log('copied ', target);
}
