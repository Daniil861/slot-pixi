// Показ выигрыша: тайминги и стиль. Устроено как config/reels.ts: тайминги — пресеты NORMAL/TURBO
// (какой активен, решает GameModel.turbo), стили — неизменяемые объекты. View получают их через
// конструктор / setTiming и конфиг не импортируют. Все времена — в секундах, суффикс Sec.

export interface WinsTiming {
    /** Докрутка счётчика WIN от 0 до выигрыша. */
    readonly counterSec: number;
    /** Пауза после докрутки, пока на поле все выигрышные линии. */
    readonly holdSec: number;
    /** Прорисовка линии слева направо. */
    readonly lineDrawSec: number;
    /** Сколько показывается каждая линия при переборе в idle. */
    readonly cycleLineSec: number;
}

/**
 * Подсветка на барабанах при показе выигрыша. Сама анимация выигрышного символа — Spine (config/spine.ts),
 * барабан только затемняет остальные символы.
 */
export interface SymbolHighlightStyle {
    /** Затемнение невыигрышных символов: tint умножает цвет текстуры, 0xffffff — без изменений. */
    readonly dimTint: number;
}

/** Линии выплат. */
export interface WinLinesStyle {
    /** Цвет линии по её индексу (по кругу, если линий больше). */
    readonly colors: readonly number[];
    readonly width: number;
    /** Тёмная подложка под линией: насколько она шире линии, цвет и прозрачность. */
    readonly shadowExtraWidth: number;
    readonly shadowColor: number;
    readonly shadowAlpha: number;
}

export const NORMAL_WINS_TIMING = Object.freeze({
    counterSec: 1.2,
    holdSec: 0.8,
    lineDrawSec: 0.4,
    cycleLineSec: 1.2,
} satisfies WinsTiming);

export const TURBO_WINS_TIMING = Object.freeze({
    ...NORMAL_WINS_TIMING,
    counterSec: 0.4,
    holdSec: 0.3,
} satisfies WinsTiming);

export const SYMBOL_HIGHLIGHT_STYLE = Object.freeze({
    dimTint: 0x666666,
} satisfies SymbolHighlightStyle);

export const WIN_LINES_STYLE = Object.freeze({
    colors: Object.freeze([0xffd54f, 0x4fc3f7, 0xef5350, 0x81c784, 0xba68c8, 0xff8a65, 0x4db6ac, 0xf06292, 0xaed581, 0x7986cb]),
    width: 10,
    shadowExtraWidth: 6,
    shadowColor: 0x000000,
    shadowAlpha: 0.5,
} satisfies WinLinesStyle);

/**
 * Фон на время показа выигрыша: темнее, менее насыщенный и размытый — внимание на поле.
 * Фильтры каждый кадр перерисовывают объект в отдельную текстуру, поэтому вне показа они снимаются совсем.
 */
export interface WinBackdropStyle {
    /** Яркость на пике: 1 — без изменений, 0 — чёрный. */
    readonly brightness: number;
    /** Насыщенность: 0 — без изменений, -1 — ч/б. */
    readonly saturation: number;
    /** Сила размытия (BlurFilter.strength). 0 — без blur. */
    readonly blur: number;
    /** Число проходов blur: больше — мягче, но дороже. */
    readonly blurQuality: number;
    /** Разрешение, в котором считается blur: меньше 1 — дешевле, на размытой картинке потеря не видна. */
    readonly blurResolution: number;
    /** Появление и исчезновение. */
    readonly fadeSec: number;
}

export const WIN_BACKDROP_STYLE = Object.freeze({
    brightness: 0.55,
    saturation: -0.4,
    blur: 6,
    blurQuality: 3,
    blurResolution: 0.5,
    fadeSec: 0.3,
} satisfies WinBackdropStyle);
