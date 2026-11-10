import { BitmapFont } from 'pixi.js';

/**
 * Bitmap-шрифты UI. Имя шрифта = fontFamily в стиле BitmapText.
 *
 * Зачем BitmapText для чисел: Text на каждое изменение заново рисует строку в canvas и грузит
 * новую текстуру в GPU. Rolling counter меняет текст каждый кадр — это дорого. BitmapText собирает
 * строку из готовых глифов одной текстуры-атласа: смена текста — только пересчёт квадов.
 * Аналог в Cocos — Label с BMFont.
 */
export const UI_FONT = 'UiFont';

/** Размер, в котором глифы растеризуются. BitmapText другого fontSize масштабирует их. */
const BASE_SIZE = 64;

let installed = false;

/**
 * Генерирует атлас глифов из системного шрифта в рантайме (без .fnt-файла).
 * Белая заливка без stroke — Pixi помечает шрифт как перекрашиваемый: цвет поля задаётся через tint,
 * и одного атласа хватает на все цвета. С обводкой или градиентом пришлось бы ставить шрифт на каждый цвет.
 *
 * Install один раз: повторный с тем же именем перезапишет запись в Cache с предупреждением.
 */
export function installFonts(): void {
    if (installed) return;
    installed = true;

    BitmapFont.install({
        name: UI_FONT,
        style: {
            fontFamily: 'Arial',
            fontSize: BASE_SIZE,
            fontWeight: 'bold',
            fill: 0xffffff,
            // Чёрная тень не мешает tint (тень — не fill), зато цифры читаются на любом фоне.
            dropShadow: { color: 0x000000, alpha: 0.6, distance: 3, blur: 2, angle: Math.PI / 2 },
        },
        // Только нужные символы: меньше атлас. Пробел — обязательно, иначе он не отрисуется.
        chars: [['0', '9'], ['A', 'Z'], ' .,'],
        // Глифы с запасом по чёткости: content масштабируется под окно, на HiDPI — ещё и resolution 2.
        resolution: 2,
    });
}
