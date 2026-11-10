// Звук: алиасы (их же использует манифест), громкости и защита от «наложения» одинаковых звуков.
// Файлы — art-src/sounds → public/assets/sounds (npm run assets).

export interface SoundDef {
    readonly alias: string;
    /** Путь относительно basePath Assets. */
    readonly src: string;
    /** 0..1, умножается на общую громкость @pixi/sound. */
    readonly volume: number;
}

export interface AudioConfig {
    /** Фоновая музыка: отдельный бандл, грузится после показа игры — не задерживает старт. */
    readonly musicBundle: string;
    readonly music: SoundDef;
    /** Вращение барабанов — в цикле, пока крутится хотя бы один. */
    readonly spin: SoundDef;
    /** Остановка барабана — на каждый барабан. */
    readonly reelStop: SoundDef;
    /** Удар выигрышного символа (событие impact в Spine). */
    readonly win: SoundDef;
    /**
     * Одинаковый звук чаще этого интервала не запускается: при quick stop встают все барабаны сразу,
     * а impact приходит от каждого выигрышного символа в одном кадре — без защиты это 5–15 копий одного звука.
     */
    readonly minRepeatSec: number;
}

export const AUDIO = Object.freeze({
    musicBundle: 'music',
    music: Object.freeze({ alias: 'music', src: 'sounds/track_slot.ogg', volume: 0.35 }),
    spin: Object.freeze({ alias: 'sfx_spin', src: 'sounds/rotate_0.ogg', volume: 0.5 }),
    reelStop: Object.freeze({ alias: 'sfx_reel_stop', src: 'sounds/stop_0.ogg', volume: 0.8 }),
    win: Object.freeze({ alias: 'sfx_win', src: 'sounds/win.ogg', volume: 0.9 }),
    minRepeatSec: 0.05,
} satisfies AudioConfig);
