import { Container, Sprite, type Renderer } from 'pixi.js';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config/gameConfig';
import { fitContain, fitCover } from '../engine/layout';
import type { Screen } from '../engine/Screen';
import type { MockRgs } from '../server/MockRgs';
import { REELS_HEIGHT, REELS_WIDTH, ReelsView } from '../views/reels/ReelsView';
import { SymbolTextures } from '../views/reels/SymbolTextures';

/**
 * Игровой экран. Два уровня раскладки:
 * - background — на всё окно (cover): без полос, края обрезаются;
 * - content — игра в дизайн-координатах 1920×1080 (contain): видна целиком.
 * Поэтому фон не внутри content: у них разные правила масштабирования.
 * Шаг 3: модель и контроллер вместо клика по полю.
 */
export class GameScreen extends Container implements Screen {
    static readonly bundles = ['game'] as const;

    private readonly background = Sprite.from('background');
    private readonly content = new Container();
    private readonly reels: ReelsView;

    constructor(renderer: Renderer, private readonly rgs: MockRgs) {
        super();
        this.background.anchor.set(0.5);
        this.addChild(this.background, this.content);

        this.reels = new ReelsView(new SymbolTextures(renderer));
        this.reels.position.set((DESIGN_WIDTH - REELS_WIDTH) / 2, (DESIGN_HEIGHT - REELS_HEIGHT) / 2);
        this.content.addChild(this.reels);

        // Временно: клик по полю — новый «спин» без анимации. В шаге 3 переедет в контроллер.
        this.reels.eventMode = 'static';
        this.reels.cursor = 'pointer';
        this.reels.on('pointertap', () => void this.spin());
    }

    async show(): Promise<void> {
        await this.spin();
    }

    resize(width: number, height: number): void {
        const { width: bgWidth, height: bgHeight } = this.background.texture;
        fitCover(this.background, width, height, bgWidth, bgHeight);
        fitContain(this.content, width, height, DESIGN_WIDTH, DESIGN_HEIGHT);
    }

    private async spin(): Promise<void> {
        const result = await this.rgs.spin(10);
        this.reels.setGrid(result.grid);
        console.log('win:', result.totalWin, 'balance:', result.balance, result.wins);
    }
}
