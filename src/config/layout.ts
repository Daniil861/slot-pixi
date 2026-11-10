// Геометрия клиента в дизайн-координатах. Совпадает с размерами арта (docs/ART_BRIEF.md).
//
// Две раскладки — ландшафт и портрет. Экран в resize выбирает ту, в которой игра получается крупнее
// (pickLayout в engine/layout.ts), расставляет элементы по её координатам и вписывает её в окно (contain).
// Размеры элементов в обеих одинаковые, отличаются дизайн-размер и позиции.

import { REEL_COUNT, ROW_COUNT } from './game';

/** Ячейка барабана. */
export const CELL_SIZE = 200;
/** Видимый размер символа внутри ячейки — с полями, чтобы символы не слипались. */
export const SYMBOL_SIZE = 180;

/** Окно барабанов: 5×3 ячейки = 1000×600. */
export const REELS_WIDTH = CELL_SIZE * REEL_COUNT;
export const REELS_HEIGHT = CELL_SIZE * ROW_COUNT;
/** Ширина рамки вокруг окна: frame.png 1160×760 при окне 1000×600. */
export const FRAME_BORDER = 80;

interface Point {
    readonly x: number;
    readonly y: number;
}

/** Размер дизайн-области — то, что вписывается в окно целиком. */
export interface DesignSize {
    readonly designWidth: number;
    readonly designHeight: number;
}

export interface GameLayout extends DesignSize {
    readonly name: 'landscape' | 'portrait';
    /** Левый верхний угол окна барабанов. */
    readonly reels: Point;
    /** Центры полей панели (Y — верх подписи). */
    readonly fields: { readonly balance: Point; readonly win: Point; readonly bet: Point };
    /** Центры кнопок. */
    readonly buttons: { readonly spin: Point; readonly turbo: Point; readonly bet: Point; readonly sound: Point };
}

export interface LoadLayout extends DesignSize {
    /** Центр логотипа. */
    readonly logo: Point;
    /** Y верха прогресс-бара (по X бар по центру). */
    readonly barY: number;
}

/** Отступ панели от низа рамки. */
const PANEL_GAP = 20;

/** Поля панели под рамкой: баланс слева, выигрыш по центру, ставка справа. */
function panelFields(reels: Point): GameLayout['fields'] {
    const y = reels.y + REELS_HEIGHT + FRAME_BORDER + PANEL_GAP;
    return {
        balance: { x: reels.x + REELS_WIDTH * 0.15, y },
        win: { x: reels.x + REELS_WIDTH * 0.5, y },
        bet: { x: reels.x + REELS_WIDTH * 0.85, y },
    };
}

// Ландшафт 1920×1080: поле по центру, кнопки колонкой справа — по центру полосы между рамкой и краем.
const LANDSCAPE_REELS = { x: (1920 - REELS_WIDTH) / 2, y: (1080 - REELS_HEIGHT) / 2 };
const LANDSCAPE_COLUMN_X = (LANDSCAPE_REELS.x + REELS_WIDTH + FRAME_BORDER + 1920) / 2;

export const LANDSCAPE_LAYOUT = Object.freeze({
    name: 'landscape',
    designWidth: 1920,
    designHeight: 1080,
    reels: LANDSCAPE_REELS,
    fields: panelFields(LANDSCAPE_REELS),
    buttons: {
        spin: { x: LANDSCAPE_COLUMN_X, y: 540 },
        turbo: { x: LANDSCAPE_COLUMN_X, y: 700 },
        bet: { x: LANDSCAPE_COLUMN_X, y: 800 },
        sound: { x: LANDSCAPE_COLUMN_X, y: 900 },
    },
} satisfies GameLayout);

// Портрет 1240×2200 (≈ 9:16): ширина — рамка 1160 + поля по 40. Поле в верхней части, под ним панель,
// ниже — Spin и ряд второстепенных кнопок (зона большого пальца).
const PORTRAIT_WIDTH = 1240;
const PORTRAIT_REELS = { x: (PORTRAIT_WIDTH - REELS_WIDTH) / 2, y: 420 };

export const PORTRAIT_LAYOUT = Object.freeze({
    name: 'portrait',
    designWidth: PORTRAIT_WIDTH,
    designHeight: 2200,
    reels: PORTRAIT_REELS,
    fields: panelFields(PORTRAIT_REELS),
    buttons: {
        spin: { x: PORTRAIT_WIDTH / 2, y: 1500 },
        turbo: { x: PORTRAIT_WIDTH * 0.2, y: 1760 },
        bet: { x: PORTRAIT_WIDTH * 0.5, y: 1760 },
        sound: { x: PORTRAIT_WIDTH * 0.8, y: 1760 },
    },
} satisfies GameLayout);

export const GAME_LAYOUTS: readonly GameLayout[] = [LANDSCAPE_LAYOUT, PORTRAIT_LAYOUT];

/** Экран загрузки: логотип и бар, в ландшафте и портрете. */
export const LOAD_LAYOUTS: readonly LoadLayout[] = [
    Object.freeze({ designWidth: 1920, designHeight: 1080, logo: { x: 960, y: 1080 * 0.4 }, barY: 1080 * 0.72 }),
    Object.freeze({ designWidth: PORTRAIT_WIDTH, designHeight: 2200, logo: { x: PORTRAIT_WIDTH / 2, y: 2200 * 0.4 }, barY: 2200 * 0.6 }),
];
