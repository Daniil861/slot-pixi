import { Container, Graphics, GraphicsContext, Rectangle, Text, type DestroyOptions } from 'pixi.js';

export type ButtonState = 'normal' | 'hover' | 'pressed' | 'disabled';

export interface ButtonOptions {
    width: number;
    height: number;
    text: string;
    fontSize?: number;
    /** Цвета заливки по состояниям. */
    colors?: Partial<Record<ButtonState, number>>;
}

const DEFAULT_COLORS: Record<ButtonState, number> = {
    normal: 0x2e7d32,
    hover: 0x43a047,
    pressed: 0x1b5e20,
    disabled: 0x555555,
};

/** Насколько кнопка «вдавливается» при нажатии. */
const PRESSED_SCALE = 0.95;

/**
 * Кнопка: фон на Graphics + надпись Text, четыре состояния.
 * Аналог компонента Button в Cocos, но в Pixi готового нет — состояния собираем из pointer-событий.
 *
 * Точка (0, 0) — центр кнопки: так scale при нажатии сжимает её к центру, а не к левому верхнему углу.
 */
export class Button extends Container {
    /** Колбэк нажатия. Вызывается на pointertap: down и up над кнопкой — как click, но и для touch. */
    onPress: (() => void) | undefined;

    private readonly background: Graphics;
    private readonly labelText: Text;
    /**
     * Фон каждого состояния нарисован один раз в свой GraphicsContext. Смена состояния — замена
     * graphics.context, без clear() и перестройки геометрии. Один контекст можно отдать и нескольким Graphics.
     */
    private readonly contexts: Record<ButtonState, GraphicsContext>;

    private _enabled = true;
    private isOver = false;
    private isDown = false;

    constructor(options: ButtonOptions) {
        super();
        const { width, height } = options;
        const colors = { ...DEFAULT_COLORS, ...options.colors };
        const radius = Math.min(width, height) * 0.25;

        const draw = (color: number) =>
            new GraphicsContext()
                .roundRect(-width / 2, -height / 2, width, height, radius)
                .fill(color)
                .stroke({ width: 4, color: 0xf5d27a });
        this.contexts = {
            normal: draw(colors.normal),
            hover: draw(colors.hover),
            pressed: draw(colors.pressed),
            disabled: draw(colors.disabled),
        };

        this.background = new Graphics(this.contexts.normal);
        this.labelText = new Text({
            text: options.text,
            style: { fontFamily: 'Arial', fontSize: options.fontSize ?? 40, fontWeight: 'bold', fill: 0xffffff },
        });
        this.labelText.anchor.set(0.5);
        this.addChild(this.background, this.labelText);

        // 'static' — объект получает события и участвует в hit-test, но сам не двигается
        // ('dynamic' дополнительно шлёт события, когда объект едет под неподвижным курсором).
        this.eventMode = 'static';
        this.cursor = 'pointer';
        // Явная зона нажатия: hit-test по прямоугольнику, а не обходом детей.
        // Можно сделать больше видимой кнопки — удобно для пальца на мобильном.
        this.hitArea = new Rectangle(-width / 2, -height / 2, width, height);

        this.on('pointerover', () => {
            this.isOver = true;
            this.refresh();
        });
        this.on('pointerout', () => {
            this.isOver = false;
            this.refresh();
        });
        this.on('pointerdown', () => {
            // На touch pointerover приходит не всегда раньше down — считаем, что палец над кнопкой.
            this.isOver = true;
            this.isDown = true;
            this.refresh();
        });
        this.on('pointerup', () => {
            this.isDown = false;
            this.refresh();
        });
        // Нажали на кнопке, отпустили снаружи: клика нет, но «нажатость» снять нужно.
        // Аналог TOUCH_CANCEL в Cocos.
        this.on('pointerupoutside', () => {
            this.isDown = false;
            this.isOver = false;
            this.refresh();
        });
        this.on('pointertap', () => {
            if (this._enabled) this.onPress?.();
        });
    }

    get enabled(): boolean {
        return this._enabled;
    }

    /**
     * Выключенная кнопка не получает события: eventMode = 'none' (объект и его дети пропускаются в hit-test).
     * Аналог interactable = false в Cocos.
     */
    set enabled(value: boolean) {
        if (value === this._enabled) return;
        this._enabled = value;
        this.eventMode = value ? 'static' : 'none';
        // Пока кнопка выключена, pointerout/up не придут — сбрасываем, чтобы не залипло «нажатое».
        this.isOver = false;
        this.isDown = false;
        this.refresh();
    }

    /** Надпись. Не label: в v8 Container.label — имя объекта для отладки (аналог node.name в Cocos). */
    get text(): string {
        return this.labelText.text;
    }

    set text(value: string) {
        this.labelText.text = value;
    }

    get state(): ButtonState {
        if (!this._enabled) return 'disabled';
        // Нажали и увели курсор с кнопки — показываем обычное состояние: отпустить там = отмена.
        if (this.isDown && this.isOver) return 'pressed';
        if (this.isOver) return 'hover';
        return 'normal';
    }

    /**
     * Контексты принадлежат кнопке, освобождаем их сами. Фон уничтожаем заранее и без опций:
     * Graphics с переданным контекстом его не трогает, а destroy(true) / { children: true } у родителя
     * уничтожил бы текущий контекст — и он был бы уничтожен дважды.
     */
    override destroy(options?: DestroyOptions): void {
        this.background.destroy();
        Object.values(this.contexts).forEach((context) => context.destroy());
        super.destroy(options);
    }

    private refresh(): void {
        const state = this.state;
        this.background.context = this.contexts[state];
        this.scale.set(state === 'pressed' ? PRESSED_SCALE : 1);
        this.labelText.alpha = state === 'disabled' ? 0.5 : 1;
    }
}
