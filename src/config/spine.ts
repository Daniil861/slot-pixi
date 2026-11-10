// Spine-анимации символов: алиасы ассетов, имена анимаций и событий (контракт с файлом скелета)
// и параметры смешивания. Скелет генерирует scripts/spine/symbolSpine.mjs (вместо экспорта из Spine Editor).

export interface SymbolSpineConfig {
    /** Алиасы в Assets (их же использует манифест). */
    readonly skeletonAlias: string;
    readonly atlasAlias: string;
    /** Имена анимаций и событий в скелете. */
    readonly idleAnimation: string;
    readonly winAnimation: string;
    readonly impactEvent: string;
    /** Плавный переход между анимациями (AnimationStateData.defaultMix): без него смена анимации — рывок. */
    readonly mixSec: number;
}

export const SYMBOL_SPINE = Object.freeze({
    skeletonAlias: 'symbolSkeleton',
    atlasAlias: 'symbolAtlas',
    idleAnimation: 'idle',
    winAnimation: 'win',
    impactEvent: 'impact',
    mixSec: 0.15,
} satisfies SymbolSpineConfig);
