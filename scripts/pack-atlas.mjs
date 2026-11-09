// Упаковка символов в атлас: art-src/symbols/*.png → public/assets/symbols.{png,json}.
// Запуск: npm run atlas. Повторять после каждого изменения исходников арта.

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { packAsync } from 'free-tex-packer-core';

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
