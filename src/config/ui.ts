// Внешний вид UI: цвета, шрифты, стили компонентов. Где компоненты стоят на экране — config/layout.ts.
// Устроено как config/reels.ts и config/wins.ts: интерфейс + неизменяемые пресеты (Object.freeze + satisfies).
// Компоненты (views/ui) получают пресет через конструктор и из config/ берут только типы; пресет выбирает экран.

/** Палитра UI. Общие цвета — здесь, чтобы золото кнопок, выигрыша и прогресс-бара не разъехалось. */
export const UI_COLORS = Object.freeze({
    gold: 0xf5d27a,
    /** Подписи полей (BALANCE, WIN, BET) — приглушённое золото. */
    goldMuted: 0xc9b07a,
    white: 0xffffff,
    black: 0x000000,
});

export type ButtonState = 'normal' | 'hover' | 'pressed' | 'disabled';

export interface ButtonStyle {
    readonly width: number;
    readonly height: number;
    /** Радиус скругления как доля меньшей стороны. */
    readonly cornerRatio: number;
    /** Цвет заливки по состояниям. */
    readonly colors: Readonly<Record<ButtonState, number>>;
    readonly strokeWidth: number;
    readonly strokeColor: number;
    readonly fontFamily: string;
    readonly fontSize: number;
    readonly textColor: number;
    /** Насколько кнопка «вдавливается» при нажатии. */
    readonly pressedScale: number;
    /** Прозрачность надписи выключенной кнопки. */
    readonly disabledTextAlpha: number;
}

/** Bitmap-шрифт, который генерируется в рантайме (BitmapFont.install). */
export interface BitmapFontStyle {
    /** Имя шрифта — его указывают как fontFamily в стиле BitmapText. */
    readonly name: string;
    /** Системный шрифт, из которого растеризуются глифы. */
    readonly sourceFamily: string;
    readonly fontWeight: 'normal' | 'bold';
    /** Размер растеризации. BitmapText другого fontSize масштабирует глифы. */
    readonly baseSize: number;
    /** Запас чёткости глифов при масштабировании. */
    readonly resolution: number;
    /** Набор глифов: строки и диапазоны ['0', '9']. Пробел нужен явно. */
    readonly chars: readonly (string | readonly [string, string])[];
    readonly shadow: {
        readonly color: number;
        readonly alpha: number;
        readonly distance: number;
        readonly blur: number;
        readonly angle: number;
    };
}

/** Поле панели: подпись + число. */
export interface ValueFieldStyle {
    /** Имя bitmap-шрифта (BitmapFontStyle.name). */
    readonly fontFamily: string;
    readonly titleSize: number;
    readonly titleColor: number;
    readonly valueSize: number;
    readonly valueColor: number;
    /** Отступ между подписью и числом. */
    readonly gap: number;
}

export interface LoadingBarStyle {
    readonly width: number;
    readonly height: number;
    readonly color: number;
    readonly trackColor: number;
    readonly trackAlpha: number;
    readonly strokeWidth: number;
    readonly percentFontFamily: string;
    readonly percentFontSize: number;
    /** Отступ подписи с процентами под баром. */
    readonly percentGap: number;
}

/** Заглушка символа, пока нет арта: плашка с id символа. Запекается в текстуру. */
export interface SymbolPlaceholderStyle {
    readonly size: number;
    /** Отступ плашки от края текстуры (место под обводку). */
    readonly inset: number;
    readonly radius: number;
    readonly fillColor: number;
    readonly strokeWidth: number;
    readonly strokeColor: number;
    readonly fontFamily: string;
    readonly fontSize: number;
    readonly textColor: number;
}

export const PRIMARY_BUTTON = Object.freeze({
    width: 240,
    height: 140,
    cornerRatio: 0.25,
    colors: Object.freeze({ normal: 0x2e7d32, hover: 0x43a047, pressed: 0x1b5e20, disabled: 0x555555 }),
    strokeWidth: 4,
    strokeColor: UI_COLORS.gold,
    fontFamily: 'Arial',
    fontSize: 52,
    textColor: UI_COLORS.white,
    pressedScale: 0.95,
    disabledTextAlpha: 0.5,
} satisfies ButtonStyle);

/** Второстепенные кнопки (Turbo, Bet): меньше и нейтрального цвета. */
export const SECONDARY_BUTTON = Object.freeze({
    ...PRIMARY_BUTTON,
    width: 200,
    height: 80,
    colors: Object.freeze({ ...PRIMARY_BUTTON.colors, normal: 0x37474f, hover: 0x546e7a, pressed: 0x263238 }),
    fontSize: 32,
} satisfies ButtonStyle);

export const UI_FONT = Object.freeze({
    name: 'UiFont',
    sourceFamily: 'Arial',
    fontWeight: 'bold',
    baseSize: 64,
    resolution: 2,
    chars: Object.freeze([Object.freeze(['0', '9'] as const), Object.freeze(['A', 'Z'] as const), ' .,']),
    shadow: Object.freeze({ color: UI_COLORS.black, alpha: 0.6, distance: 3, blur: 2, angle: Math.PI / 2 }),
} satisfies BitmapFontStyle);

export const VALUE_FIELD = Object.freeze({
    fontFamily: UI_FONT.name,
    titleSize: 26,
    titleColor: UI_COLORS.goldMuted,
    valueSize: 48,
    valueColor: UI_COLORS.white,
    gap: 4,
} satisfies ValueFieldStyle);

/** Поле WIN: крупнее и золотом. */
export const WIN_FIELD = Object.freeze({
    ...VALUE_FIELD,
    valueSize: 56,
    valueColor: UI_COLORS.gold,
} satisfies ValueFieldStyle);

export const LOADING_BAR = Object.freeze({
    width: 600,
    height: 24,
    color: UI_COLORS.gold,
    trackColor: UI_COLORS.black,
    trackAlpha: 0.5,
    strokeWidth: 2,
    percentFontFamily: 'Arial',
    percentFontSize: 28,
    percentGap: 16,
} satisfies LoadingBarStyle);

export const SYMBOL_PLACEHOLDER = Object.freeze({
    size: 256,
    inset: 8,
    radius: 32,
    fillColor: 0x5a1a1a,
    strokeWidth: 8,
    strokeColor: UI_COLORS.gold,
    fontFamily: 'Arial',
    fontSize: 48,
    textColor: UI_COLORS.gold,
} satisfies SymbolPlaceholderStyle);
