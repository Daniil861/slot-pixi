import { gsap } from 'gsap';
import { BitmapText, Container, type DestroyOptions } from 'pixi.js';
import type { ValueFieldStyle } from '../../config/ui';

/**
 * Поле панели: подпись (BALANCE / BET / WIN) и число под ней. Обе строки — BitmapText одного шрифта,
 * цвет — через tint. (0, 0) — центр по горизонтали, верх подписи. Размеры и цвета — пресет ValueFieldStyle.
 * Bitmap-шрифт style.fontFamily должен быть установлен до создания поля (installBitmapFont).
 *
 * setValue(value, durationSec) — rolling counter: показанное число твинится от текущего к новому.
 */
export class ValueField extends Container {
    private readonly titleText: BitmapText;
    private readonly valueText: BitmapText;
    /** Показанное значение. Его твинит GSAP, текст обновляется в onUpdate. */
    private readonly shown = { value: 0 };
    private tween: gsap.core.Tween | undefined;
    private finishTween: (() => void) | undefined;

    constructor(style: ValueFieldStyle, title: string) {
        super();
        this.titleText = new BitmapText({
            text: title,
            style: { fontFamily: style.fontFamily, fontSize: style.titleSize },
        });
        this.titleText.tint = style.titleColor;
        this.titleText.anchor.set(0.5, 0);

        this.valueText = new BitmapText({
            text: '0',
            style: { fontFamily: style.fontFamily, fontSize: style.valueSize },
        });
        this.valueText.tint = style.valueColor;
        this.valueText.anchor.set(0.5, 0);
        this.valueText.y = this.titleText.height + style.gap;

        this.addChild(this.titleText, this.valueText);
    }

    get value(): number {
        return this.shown.value;
    }

    /**
     * Показать значение. durationSec = 0 — сразу. Иначе счётчик докручивается за это время;
     * промис завершается, когда счётчик дошёл (или был прерван finish / новым setValue).
     */
    setValue(value: number, durationSec = 0): Promise<void> {
        this.finish();
        if (durationSec <= 0 || value === this.shown.value) {
            this.shown.value = value;
            this.render();
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            this.finishTween = () => {
                this.finishTween = undefined;
                resolve();
            };
            this.tween = gsap.to(this.shown, {
                value,
                duration: durationSec,
                ease: 'power1.out',
                onUpdate: () => this.render(),
                onComplete: () => this.finishTween?.(),
            });
        });
    }

    /** Докрутить счётчик до конца сразу (skip). */
    finish(): void {
        if (!this.tween) return;
        // progress(1) выставляет конечное значение и вызывает onUpdate/onComplete.
        this.tween.progress(1).kill();
        this.tween = undefined;
        this.finishTween?.();
    }

    override destroy(options?: DestroyOptions): void {
        this.tween?.kill();
        super.destroy(options);
    }

    private render(): void {
        // Целые: ставки и выигрыши в демо — целые кредиты. Разделитель тысяч есть в наборе глифов.
        this.valueText.text = Math.round(this.shown.value).toLocaleString('en-US');
    }
}
