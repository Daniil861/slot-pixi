// Форма игры — общий контракт клиента и сервера: размер сетки и id символов.
// Без пикселей, таймингов и математики: геометрия — layout.ts, тайминги — reels.ts, математика — server/math.ts.

export const REEL_COUNT = 5;
export const ROW_COUNT = 3;

/** Id символов. Совпадают с именами кадров в атласе (имена файлов в art-src/symbols без расширения). */
export const SYMBOL_IDS = ['10', 'j', 'queen', 'king', 'ace', 'high1', 'high2', 'high3', 'wild'] as const;

export type SymbolId = (typeof SYMBOL_IDS)[number];

/**
 * Равномерно случайный символ — для «шума» на крутящейся ленте и скрытых позиций.
 * Веса здесь не нужны: они определяют результат, а результат считает сервер.
 */
export function randomSymbolId(): SymbolId {
    return SYMBOL_IDS[Math.floor(Math.random() * SYMBOL_IDS.length)]!;
}
