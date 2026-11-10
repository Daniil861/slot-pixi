import type { AssetsManifest } from 'pixi.js';
import { SYMBOL_SPINE } from './spine';

/**
 * Манифест ассетов — аналог набора Asset Bundle в Cocos: описывает, ЧТО грузить и какими группами.
 * Пути относительные к basePath из Assets.init (у нас 'assets/' → файлы из public/assets/).
 * Какие бандлы нужны экрану — указано в самом экране (static bundles).
 */
export const manifest: AssetsManifest = {
    bundles: [
        {
            // Всё для экрана загрузки. Маленький бандл: грузится до показа экрана, без прогресса.
            name: 'loading',
            assets: [{ alias: 'logo', src: 'ui/logo.png' }],
        },
        {
            // Всё для игрового экрана. Грузится с прогресс-баром на экране загрузки.
            name: 'game',
            assets: [
                // JSON атласа: загрузчик spritesheet сам подтянет symbols.png из meta.image
                // и положит каждый кадр в кэш под его именем ('ace', 'king', ...).
                { alias: 'symbols', src: 'symbols.json' },
                { alias: 'background', src: 'background/bg_landscape.jpg' },
                { alias: 'reels_bg', src: 'reels/reels_bg.png' },
                { alias: 'reels_frame', src: 'reels/frame.png' },
                // Spine: атлас ссылается на тот же symbols.png (страница атласа), отдельной текстуры нет.
                // Загрузчик .atlas сам грузит картинку страницы рядом с файлом атласа.
                { alias: SYMBOL_SPINE.atlasAlias, src: 'symbols.atlas' },
                // JSON-скелет: загрузчик Spine узнаёт его по полю bones (спрайтшит — по frames/meta).
                { alias: SYMBOL_SPINE.skeletonAlias, src: 'spine/symbol.json' },
            ],
        },
    ],
};
