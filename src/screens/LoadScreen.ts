import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config/layout';
import { fitContain } from '../engine/layout';
import type { Screen } from '../engine/Screen';

const BAR_WIDTH = 600;
const BAR_HEIGHT = 24;
const BAR_RADIUS = BAR_HEIGHT / 2;

/** Экран загрузки: логотип + прогресс-бар на Graphics. Прогресс приходит из Navigation через onLoad. */
export class LoadScreen extends Container implements Screen {
    /** Бандлы, которые должны быть загружены до создания экрана. */
    static readonly bundles = ['loading'] as const;

    /** Всё содержимое в дизайн-координатах 1920×1080; масштабируется целиком в resize. */
    private readonly content = new Container();
    private readonly fill = new Graphics();
    private readonly percentText = new Text({
        text: '0%',
        style: { fontFamily: 'Arial', fontSize: 28, fill: 0xf5d27a },
    });

    constructor() {
        super();
        this.addChild(this.content);

        // Логотип уже в кэше: бандл 'loading' загружен до вызова конструктора.
        const logo = Sprite.from('logo');
        logo.anchor.set(0.5);
        logo.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.4);
        this.content.addChild(logo);

        const track = new Graphics()
            .roundRect(0, 0, BAR_WIDTH, BAR_HEIGHT, BAR_RADIUS)
            .fill({ color: 0x000000, alpha: 0.5 })
            .stroke({ width: 2, color: 0xf5d27a });

        const bar = new Container();
        bar.position.set((DESIGN_WIDTH - BAR_WIDTH) / 2, DESIGN_HEIGHT * 0.72);
        bar.addChild(track, this.fill);

        this.percentText.anchor.set(0.5, 0);
        this.percentText.position.set(BAR_WIDTH / 2, BAR_HEIGHT + 16);
        bar.addChild(this.percentText);

        this.content.addChild(bar);
        this.onLoad(0);
    }

    onLoad(progress: number): void {
        const p = Math.min(Math.max(progress, 0), 1);

        // Перерисовываем заливку целиком: clear() сбрасывает команды GraphicsContext.
        // Событий прогресса единицы (по одному на файл), так что это дёшево.
        // Альтернатива — рисовать один раз и менять scale.x, но тогда сплющатся скругления.
        this.fill.clear();
        const width = BAR_WIDTH * p;
        if (width >= BAR_HEIGHT) {
            this.fill.roundRect(0, 0, width, BAR_HEIGHT, BAR_RADIUS).fill(0xf5d27a);
        }
        this.percentText.text = `${Math.round(p * 100)}%`;
    }

    resize(width: number, height: number): void {
        fitContain(this.content, width, height, DESIGN_WIDTH, DESIGN_HEIGHT);
    }
}
