// Конфиг игры: геометрия поля, символы, пэйтейбл, линии выплат.
// Чистые данные без зависимостей от Pixi — их используют и mock-RGS, и отображение.

export const REEL_COUNT = 5;
export const ROW_COUNT = 3;

/**
 * Дизайн-разрешение: вся раскладка считается в этих координатах,
 * а корневой контейнер масштабируется под реальный экран (см. engine/layout.ts).
 */
export const DESIGN_WIDTH = 1920;
export const DESIGN_HEIGHT = 1080;

/** Ячейка барабана (см. docs/ART_BRIEF.md): поле 5×3 = 1000×600. */
export const CELL_SIZE = 200;
/** Видимый размер символа внутри ячейки — с полями, чтобы символы не слипались. */
export const SYMBOL_SIZE = 180;

/** Id символа. Совпадает с именем кадра в атласе (имя файла без расширения в art-src/symbols). */
export type SymbolId = '10' | 'j' | 'queen' | 'king' | 'ace' | 'high1' | 'high2' | 'high3' | 'wild';

export interface SymbolDef {
    id: SymbolId;
    /** Вес при генерации ленты: чем больше, тем чаще выпадает. */
    weight: number;
    /** Выплата (множитель ставки на линию) за 3, 4 и 5 символов подряд. */
    pays: [three: number, four: number, five: number];
}

export const SYMBOLS: readonly SymbolDef[] = [
    { id: '10', weight: 30, pays: [5, 10, 25] },
    { id: 'j', weight: 30, pays: [5, 10, 25] },
    { id: 'queen', weight: 26, pays: [5, 15, 30] },
    { id: 'king', weight: 24, pays: [5, 15, 40] },
    { id: 'ace', weight: 22, pays: [10, 20, 50] },
    { id: 'high1', weight: 12, pays: [10, 30, 100] },
    { id: 'high2', weight: 10, pays: [15, 50, 150] },
    { id: 'high3', weight: 8, pays: [20, 75, 250] },
    // wild заменяет любой символ; линия из одних wild платит по своей таблице
    { id: 'wild', weight: 5, pays: [25, 100, 500] },
];

export const WILD: SymbolId = 'wild';

/**
 * Линии выплат: для каждого барабана — индекс ряда (0 — верхний).
 * Выигрыш считается слева направо, от первого барабана.
 */
export const PAYLINES: readonly (readonly number[])[] = [
    [1, 1, 1, 1, 1], // середина
    [0, 0, 0, 0, 0], // верх
    [2, 2, 2, 2, 2], // низ
    [0, 1, 2, 1, 0], // V
    [2, 1, 0, 1, 2], // перевернутая V
    [0, 0, 1, 2, 2],
    [2, 2, 1, 0, 0],
    [1, 0, 0, 0, 1],
    [1, 2, 2, 2, 1],
    [0, 1, 1, 1, 0],
];

export const BETS: readonly number[] = [10, 20, 50, 100];
export const START_BALANCE = 1000;
