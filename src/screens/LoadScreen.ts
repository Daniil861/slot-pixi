import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { LOAD_LAYOUTS, type LoadLayout } from '../config/layout';
import { LOADING_BAR } from '../config/ui';
import { fitContain, pickLayout } from '../engine/layout';
import type { Screen } from '../engine/Screen';

/** Скругление на всю высоту — «таблетка». Следует из формы, а не настройка. */
const BAR_RADIUS = LOADING_BAR.height / 2;

/** Экран загрузки: логотип + прогресс-бар на Graphics. Прогресс приходит из Navigation через onLoad. */
export class LoadScreen extends Container implements Screen {
    /** Бандлы, которые должны быть загружены до создания экрана. */
    static readonly bundles = ['loading'] as const;

    /** Всё содержимое в дизайн-координатах раскладки (ландшафт или портрет); масштабируется целиком в resize. */
    private readonly content = new Container();
    private readonly logo: Sprite;
    private readonly bar = new Container();
    private layout: LoadLayout | undefined;
    private readonly fill = new Graphics();
    private readonly percentText = new Text({
        text: '0%',
        style: { fontFamily: LOADING_BAR.percentFontFamily, fontSize: LOADING_BAR.percentFontSize, fill: LOADING_BAR.color },
    });

    constructor() {
        super();
        this.addChild(this.content);

        // Логотип уже в кэше: бандл 'loading' загружен до вызова конструктора.
        this.logo = Sprite.from('logo');
        this.logo.anchor.set(0.5);
        this.content.addChild(this.logo);

        const { width, height } = LOADING_BAR;
        const track = new Graphics()
            .roundRect(0, 0, width, height, BAR_RADIUS)
            .fill({ color: LOADING_BAR.trackColor, alpha: LOADING_BAR.trackAlpha })
            .stroke({ width: LOADING_BAR.strokeWidth, color: LOADING_BAR.color });

        this.bar.addChild(track, this.fill);

        this.percentText.anchor.set(0.5, 0);
        this.percentText.position.set(width / 2, height + LOADING_BAR.percentGap);
        this.bar.addChild(this.percentText);

        this.content.addChild(this.bar);
        this.onLoad(0);
    }

    onLoad(progress: number): void {
        const p = Math.min(Math.max(progress, 0), 1);

        // Перерисовываем заливку целиком: clear() сбрасывает команды GraphicsContext.
        // Событий прогресса единицы (по одному на файл), так что это дёшево.
        // Альтернатива — рисовать один раз и менять scale.x, но тогда сплющатся скругления.
        this.fill.clear();
        const width = LOADING_BAR.width * p;
        // Уже высоты бар не рисуем: скругление на всю высоту не поместится.
        if (width >= LOADING_BAR.height) {
            this.fill.roundRect(0, 0, width, LOADING_BAR.height, BAR_RADIUS).fill(LOADING_BAR.color);
        }
        this.percentText.text = `${Math.round(p * 100)}%`;
    }

    resize(width: number, height: number): void {
        const layout = pickLayout(LOAD_LAYOUTS, width, height);
        if (layout !== this.layout) {
            this.layout = layout;
            this.logo.position.copyFrom(layout.logo);
            this.bar.position.set((layout.designWidth - LOADING_BAR.width) / 2, layout.barY);
        }
        fitContain(this.content, width, height, layout.designWidth, layout.designHeight);
    }
}
