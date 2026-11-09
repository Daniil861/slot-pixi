import { Container, type Renderer } from 'pixi.js';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config/gameConfig';
import { fitContain } from '../engine/layout';
import type { Screen } from '../engine/Screen';
import type { MockRgs } from '../server/MockRgs';
import { REELS_HEIGHT, REELS_WIDTH, ReelsView } from '../views/reels/ReelsView';
import { SymbolTextures } from '../views/reels/SymbolTextures';

/**
 * Игровой экран. Пока (шаг 1) — перенос прежнего поля из main.ts без изменений.
 * Шаг 2: фон, рамка, подложка. Шаг 3: модель и контроллер вместо клика по полю.
 */
export class GameScreen extends Container implements Screen {
    static readonly bundles = ['game'] as const;

    private readonly content = new Container();
    private readonly reels: ReelsView;

    constructor(renderer: Renderer, private readonly rgs: MockRgs) {
        super();
        this.addChild(this.content);

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
        fitContain(this.content, width, height, DESIGN_WIDTH, DESIGN_HEIGHT);
    }

    private async spin(): Promise<void> {
        const result = await this.rgs.spin(10);
        this.reels.setGrid(result.grid);
        console.log('win:', result.totalWin, 'balance:', result.balance, result.wins);
    }
}
