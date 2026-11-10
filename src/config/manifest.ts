import type { AssetsManifest } from 'pixi.js';
import { AUDIO } from './audio';
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
                // Короткие звуки — в бандле игры: нужны с первого спина. Загрузчик @pixi/sound кладёт их
                // в библиотеку sound под алиасом (sound.play(alias)).
                ...[AUDIO.spin, AUDIO.reelStop, AUDIO.win].map(({ alias, src }) => ({ alias, src })),
            ],
        },
        {
            // Музыка (~2.7 МБ) — отдельно: грузится после показа игры и не задерживает старт.
            name: AUDIO.musicBundle,
            assets: [{ alias: AUDIO.music.alias, src: AUDIO.music.src }],
        },
    ],
};
