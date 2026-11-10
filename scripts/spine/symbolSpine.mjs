// Генератор Spine-ассетов символов: вместо экспорта из Spine Editor (лицензии нет, арт — свой).
// Формат — Spine JSON 4.3 и текстовый .atlas; поля сверены с парсерами spine-core
// (SkeletonJson.readSkeletonData / readAnimation, TextureAtlas).
//
// Скелет один на все символы, символ выбирается скином (skin = SymbolId):
//   root → symbol (кость, которую анимируем)
//   слоты: symbol (картинка) и glow (та же картинка, blend additive — вспышка)
// Анимации: idle (лёгкое «дыхание», для цикла), win (удар + вспышка + покачивание), событие impact.

/**
 * .atlas поверх уже собранного symbols.png: регионы = кадры из JSON спрайтшита.
 * Отдельная текстура не нужна — Spine и спрайты барабанов рисуют из одной.
 * Важно: пустая строка в .atlas начинает новую страницу, поэтому между заголовком страницы и регионами её нет.
 */
export function buildAtlas(sheet) {
    const { w, h } = sheet.meta.size;
    const lines = [sheet.meta.image, `size: ${w},${h}`, 'filter: Linear,Linear', 'pma: false'];
    for (const [name, { frame }] of Object.entries(sheet.frames)) {
        lines.push(name, `bounds: ${frame.x},${frame.y},${frame.w},${frame.h}`);
    }
    return lines.join('\n') + '\n';
}

/**
 * Безье-кривая ключа для Spine JSON: на каждое анимируемое значение 4 числа (cx1, cy1, cx2, cy2)
 * в координатах «время, значение». Здесь — easing как у CSS cubic-bezier(x1, y1, x2, y2).
 */
function curve(t1, t2, [x1, y1, x2, y2], ...valuePairs) {
    return valuePairs.flatMap(([v1, v2]) => [
        t1 + (t2 - t1) * x1,
        v1 + (v2 - v1) * y1,
        t1 + (t2 - t1) * x2,
        v1 + (v2 - v1) * y2,
    ]);
}

const EASE_OUT = [0.25, 0.75, 0.5, 1];
const EASE_IN_OUT = [0.42, 0, 0.58, 1];

/** Ключи scale: [time, value], одинаковый x и y; между ключами — EASE_IN_OUT. */
function scaleKeys(keys) {
    return keys.map(([time, value], i) => {
        const next = keys[i + 1];
        const key = { time, x: value, y: value };
        if (next) key.curve = curve(time, next[0], EASE_IN_OUT, [value, next[1]], [value, next[1]]);
        return key;
    });
}

/** Ключи rotate: [time, degrees]. */
function rotateKeys(keys) {
    return keys.map(([time, value], i) => {
        const next = keys[i + 1];
        const key = { time, value };
        if (next) key.curve = curve(time, next[0], EASE_IN_OUT, [value, next[1]]);
        return key;
    });
}

/**
 * @param ids — id символов (имена регионов атласа), по скину на каждый
 * @param size — размер картинки символа в атласе (px); attachment рисуется этим размером
 */
export function buildSymbolSkeleton(ids, size) {
    const attachment = (id) => ({ symbol: { path: id, width: size, height: size } });

    return {
        skeleton: { spine: '4.3.00', x: -size / 2, y: -size / 2, width: size, height: size, images: './', audio: '' },
        bones: [{ name: 'root' }, { name: 'symbol', parent: 'root' }],
        slots: [
            { name: 'symbol', bone: 'symbol', attachment: 'symbol' },
            // Вспышка: копия символа поверх, additive. В setup pose прозрачная (альфа 00).
            { name: 'glow', bone: 'symbol', attachment: 'symbol', color: 'ffffff00', blend: 'additive' },
        ],
        // Скин на символ: оба слота показывают регион этого символа. Ключ «symbol» — имя attachment в слоте.
        skins: ids.map((id) => ({ name: id, attachments: { symbol: attachment(id), glow: attachment(id) } })),
        // Событие для звука и эффектов: в win — момент «удара».
        events: { impact: {} },
        animations: {
            idle: {
                bones: {
                    symbol: { scale: scaleKeys([[0, 1], [1, 1.03], [2, 1]]) },
                },
            },
            win: {
                bones: {
                    symbol: {
                        // Удар: быстрый рост, отскок ниже нормы, затухающие колебания.
                        scale: [
                            { time: 0, x: 1, y: 1, curve: curve(0, 0.15, EASE_OUT, [1, 1.25], [1, 1.25]) },
                            ...scaleKeys([[0.15, 1.25], [0.35, 0.95], [0.55, 1.1], [0.8, 1], [1.2, 1]]),
                        ],
                        rotate: rotateKeys([[0, 0], [0.15, -6], [0.35, 5], [0.55, -3], [0.8, 0], [1.2, 0]]),
                    },
                },
                slots: {
                    // Вспышка на пике удара и плавное затухание.
                    glow: {
                        rgba: [
                            { time: 0, color: 'ffffff00' },
                            { time: 0.15, color: 'ffffffcc' },
                            { time: 0.8, color: 'ffffff00' },
                        ],
                    },
                },
                events: [{ time: 0.15, name: 'impact' }],
            },
        },
    };
}
