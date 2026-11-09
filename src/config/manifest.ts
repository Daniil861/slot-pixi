import type { AssetsManifest } from 'pixi.js';

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
            ],
        },
    ],
};
