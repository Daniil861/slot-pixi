import { BitmapFont } from 'pixi.js';
import type { BitmapFontStyle } from '../../config/ui';

/**
 * Bitmap-шрифты UI. Имя шрифта = fontFamily в стиле BitmapText.
 *
 * Зачем BitmapText для чисел: Text на каждое изменение заново рисует строку в canvas и грузит
 * новую текстуру в GPU. Rolling counter меняет текст каждый кадр — это дорого. BitmapText собирает
 * строку из готовых глифов одной текстуры-атласа: смена текста — только пересчёт квадов.
 * Аналог в Cocos — Label с BMFont.
 */
const installed = new Set<string>();

/**
 * Генерирует атлас глифов из системного шрифта в рантайме (без .fnt-файла). Параметры — пресет из config/ui.ts.
 * Имя шрифта (style.name) потом указывают как fontFamily в стиле BitmapText.
 * Белая заливка без stroke — Pixi помечает шрифт как перекрашиваемый: цвет поля задаётся через tint,
 * и одного атласа хватает на все цвета. С обводкой или градиентом пришлось бы ставить шрифт на каждый цвет.
 *
 * Install один раз на имя: повторный с тем же именем перезапишет запись в Cache с предупреждением.
 */
export function installBitmapFont(style: BitmapFontStyle): void {
    if (installed.has(style.name)) return;
    installed.add(style.name);

    BitmapFont.install({
        name: style.name,
        style: {
            fontFamily: style.sourceFamily,
            fontSize: style.baseSize,
            fontWeight: style.fontWeight,
            // Белая заливка — условие перекраски через tint, поэтому она не настраивается.
            fill: 0xffffff,
            // Тень не мешает tint, если она чёрная (тень — не fill), зато цифры читаются на любом фоне.
            dropShadow: { ...style.shadow },
        },
        // Только нужные символы: меньше атлас. Пробел — обязательно, иначе он не отрисуется.
        chars: style.chars.map((c) => (typeof c === 'string' ? c : [...c])),
        // Глифы с запасом по чёткости: content масштабируется под окно, на HiDPI — ещё и resolution renderer.
        resolution: style.resolution,
    });
}
