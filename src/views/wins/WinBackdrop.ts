import { gsap } from 'gsap';
import { BlurFilter, ColorMatrixFilter, type Container } from 'pixi.js';
import type { WinBackdropStyle } from '../../config/wins';

/**
 * Затемнение и размытие фона на время показа выигрыша — фильтры на target (фон игры).
 *
 * Фильтр в Pixi: объект рисуется в отдельную текстуру, к ней применяется шейдер, результат — на экран.
 * Это стоит каждый кадр (и разрывает батч), поэтому:
 * - вне показа фильтры сняты совсем (target.filters = null), а не оставлены с нулевой силой;
 * - blur считается в половинном разрешении (blurResolution) — размытая картинка этого не выдаёт.
 * Аналог в Cocos — материал с кастомным эффектом на Sprite / постэффект камеры.
 *
 * Для одного только затемнения дешевле tint (умножение цвета без лишней текстуры), фильтр нужен
 * ради blur и обесцвечивания.
 */
export class WinBackdrop {
    private readonly colorMatrix = new ColorMatrixFilter();
    private readonly blur: BlurFilter;
    /** 0 — фон как обычно, 1 — полный эффект. GSAP твинит value, apply() пересчитывает фильтры. */
    private readonly progress = { value: 0 };
    private tween: gsap.core.Tween | undefined;

    constructor(
        private readonly target: Container,
        private readonly style: WinBackdropStyle,
    ) {
        this.blur = new BlurFilter({ strength: 0, quality: style.blurQuality, resolution: style.blurResolution });
    }

    show(): void {
        this.fadeTo(1);
    }

    hide(): void {
        this.fadeTo(0);
    }

    destroy(): void {
        this.tween?.kill();
        this.target.filters = null;
        this.colorMatrix.destroy();
        this.blur.destroy();
    }

    private fadeTo(value: number): void {
        this.tween?.kill();
        if (value === this.progress.value) {
            if (value === 0) this.target.filters = null;
            return;
        }
        // Порядок важен: цвет, потом blur (размываем уже затемнённую картинку; наоборот — то же, но так нагляднее).
        this.target.filters = [this.colorMatrix, this.blur];
        this.tween = gsap.to(this.progress, {
            value,
            duration: this.style.fadeSec,
            ease: 'power1.out',
            onUpdate: () => this.apply(),
            onComplete: () => {
                if (value === 0) this.target.filters = null;
            },
        });
    }

    private apply(): void {
        const t = this.progress.value;
        const { brightness, saturation, blur } = this.style;
        // brightness(..., false) заменяет матрицу, saturate(..., true) домножает на неё — эффекты складываются.
        this.colorMatrix.brightness(1 - (1 - brightness) * t, false);
        this.colorMatrix.saturate(saturation * t, true);
        this.blur.strength = blur * t;
    }
}
