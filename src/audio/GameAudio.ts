import { sound } from '@pixi/sound';
import type { AudioConfig, SoundDef } from '../config/audio';

/**
 * Звуки игры поверх @pixi/sound. Экран вызывает методы в моменты игры (спин, остановка барабана, удар символа),
 * какие файлы и с какой громкостью играть — знает только этот класс и config/audio.ts.
 *
 * @pixi/sound — глобальная библиотека `sound`: звуки, загруженные через Assets, регистрируются в ней по алиасу.
 * Аналог AudioSource/audioEngine в Cocos, но без компонента на узле: звук не часть сцены.
 *
 * Разблокировка: браузер не даёт играть звук до первого жеста пользователя (autoplay policy), WebAudio-контекст
 * стартует в состоянии suspended. @pixi/sound сам вешает на document mousedown/touchend и делает resume
 * при первом клике. Звуки, запущенные раньше, начнут звучать после разблокировки.
 */
export class GameAudio {
    /** Когда звук последний раз запускался (ms, performance.now) — для minRepeatSec. */
    private readonly lastPlayed = new Map<string, number>();

    constructor(private readonly config: AudioConfig) {}

    /** Музыка в цикле. Вызывать после загрузки бандла musicBundle. */
    startMusic(): void {
        const { alias, volume } = this.config.music;
        if (!sound.exists(alias) || sound.find(alias).isPlaying) return;
        void sound.play(alias, { loop: true, volume });
    }

    spinStarted(): void {
        const { alias, volume } = this.config.spin;
        sound.stop(alias);
        void sound.play(alias, { loop: true, volume });
    }

    spinFinished(): void {
        sound.stop(this.config.spin.alias);
    }

    reelStopped(): void {
        this.playOnce(this.config.reelStop);
    }

    winImpact(): void {
        this.playOnce(this.config.win);
    }

    /** Mute всего: и звуков, и музыки. Громкость и воспроизведение сохраняются, звук просто глушится. */
    setMuted(muted: boolean): void {
        if (muted) sound.muteAll();
        else sound.unmuteAll();
    }

    destroy(): void {
        sound.stop(this.config.spin.alias);
    }

    /** Одиночный звук с защитой от одновременных копий. */
    private playOnce({ alias, volume }: SoundDef): void {
        const now = performance.now();
        const last = this.lastPlayed.get(alias) ?? -Infinity;
        if (now - last < this.config.minRepeatSec * 1000) return;
        this.lastPlayed.set(alias, now);
        void sound.play(alias, { volume });
    }
}
