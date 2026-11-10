// Геометрия клиента в дизайн-координатах. Совпадает с размерами арта (docs/ART_BRIEF.md).

import { REEL_COUNT, ROW_COUNT } from './game';

/** Дизайн-разрешение: раскладка считается в этих координатах, экран масштабирует контент (engine/layout.ts). */
export const DESIGN_WIDTH = 1920;
export const DESIGN_HEIGHT = 1080;

/** Ячейка барабана. */
export const CELL_SIZE = 200;
/** Видимый размер символа внутри ячейки — с полями, чтобы символы не слипались. */
export const SYMBOL_SIZE = 180;

/** Окно барабанов: 5×3 ячейки = 1000×600. */
export const REELS_WIDTH = CELL_SIZE * REEL_COUNT;
export const REELS_HEIGHT = CELL_SIZE * ROW_COUNT;
/** Ширина рамки вокруг окна: frame.png 1160×760 при окне 1000×600. */
export const FRAME_BORDER = 80;

/** Панель BALANCE / WIN / BET под рамкой: отступ от низа рамки и центры полей (доля ширины окна барабанов). */
export const PANEL_GAP = 20;
export const PANEL_FIELD_X = Object.freeze({ balance: 0.15, win: 0.5, bet: 0.85 });

/** Колонка кнопок справа от поля (X — по центру полосы между рамкой и краем): Y центров кнопок. */
export const BUTTON_COLUMN_Y = Object.freeze({
    spin: DESIGN_HEIGHT / 2,
    turbo: DESIGN_HEIGHT / 2 + 160,
    bet: DESIGN_HEIGHT / 2 + 260,
});

/** Экран загрузки: Y центра логотипа и Y верха прогресс-бара. */
export const LOGO_Y = DESIGN_HEIGHT * 0.4;
export const LOADING_BAR_Y = DESIGN_HEIGHT * 0.72;
