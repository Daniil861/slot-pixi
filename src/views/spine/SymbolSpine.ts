import { Spine } from '@esotericsoftware/spine-pixi-v8';
import { Container, type DestroyOptions } from 'pixi.js';
import type { SymbolId } from '../../config/game';
import type { SymbolSpineConfig } from '../../config/spine';

/** Основная дорожка AnimationState. Дорожки — слои анимаций: верхняя перекрывает нижнюю (как слои в Animator Unity). */
const MAIN_TRACK = 0;

/**
 * Анимированный символ на Spine. Один скелет на все символы, символ выбирается скином.
 * Аналог sp.Skeleton в Cocos: Spine — это Container, AnimationState и Skeleton — те же классы spine-core.
 *
 * Время: autoUpdate = false, обновление — из update(deltaSec) по цепочке кадра от app.ticker.
 * По умолчанию Spine подписывается на Ticker.shared, а у Application свой ticker — получились бы вторые часы
 * (то же, что с GSAP, см. Engine).
 *
 * (0, 0) — центр символа: скелет построен вокруг центра (кость symbol в начале координат).
 */
export class SymbolSpine extends Container {
    /** Колбэк события impact в анимации win — для звука и эффектов (шаг 3). */
    onImpact: (() => void) | undefined;

    private readonly spine: Spine;
    private winResolve: (() => void) | undefined;

    constructor(
        private readonly config: SymbolSpineConfig,
        /** Размер, в котором показывать символ (px), — как у спрайта на барабане. */
        displaySize: number,
    ) {
        super();
        // Spine.from берёт уже загруженные Assets скелет и атлас (бандл 'game') и строит SkeletonData.
        // SkeletonData кэшируется по паре алиасов: второй SymbolSpine не парсит JSON заново.
        this.spine = Spine.from({ skeleton: config.skeletonAlias, atlas: config.atlasAlias, autoUpdate: false });
        this.addChild(this.spine);

        // Размер картинки в скелете — размер региона атласа; приводим к размеру символа на поле.
        this.spine.scale.set(displaySize / this.spine.skeleton.data.width);

        // Mix — длительность смешивания при смене анимации на дорожке (setMix — для конкретной пары).
        this.spine.state.data.defaultMix = config.mixSec;

        this.spine.state.addListener({
            event: (_entry, event) => {
                if (event.data.name === config.impactEvent) this.onImpact?.();
            },
            complete: (entry) => {
                if (entry.animation?.name === config.winAnimation) this.finishWin();
            },
        });
    }

    /**
     * Сменить символ. setSkin меняет набор attachment, но не трогает текущие слоты —
     * setupPoseSlots() возвращает слотам attachment из setup pose (в 4.3; в старых версиях — setSlotsToSetupPose).
     */
    setSymbol(id: SymbolId): void {
        this.spine.skeleton.setSkin(id);
        this.spine.skeleton.setupPoseSlots();
    }

    playIdle(): void {
        this.finishWin();
        this.spine.state.setAnimation(MAIN_TRACK, this.config.idleAnimation, true);
    }

    /**
     * Проиграть win один раз и вернуться в idle. Промис — когда win закончилась (событие complete).
     * addAnimation ставит idle в очередь дорожки: она начнётся после win, переход сгладит mix.
     */
    playWin(): Promise<void> {
        this.finishWin();
        this.spine.state.setAnimation(MAIN_TRACK, this.config.winAnimation, false);
        this.spine.state.addAnimation(MAIN_TRACK, this.config.idleAnimation, true, 0);
        return new Promise((resolve) => (this.winResolve = resolve));
    }

    /** Каждый кадр, в секундах. */
    update(deltaSec: number): void {
        this.spine.update(deltaSec);
    }

    override destroy(options?: DestroyOptions): void {
        this.spine.state.clearListeners();
        this.finishWin();
        super.destroy(options);
    }

    /** Завершить ожидание win (закончилась или прервана новой анимацией). */
    private finishWin(): void {
        const resolve = this.winResolve;
        this.winResolve = undefined;
        resolve?.();
    }
}
