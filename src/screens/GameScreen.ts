import { Container, Sprite, Text, type DestroyOptions, type Renderer } from 'pixi.js';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config/gameConfig';
import { fitContain, fitCover } from '../engine/layout';
import type { Screen } from '../engine/Screen';
import { GameController } from '../game/GameController';
import type { GameModel } from '../game/GameModel';
import type { RgsClient } from '../server/RgsClient';
import { REELS_HEIGHT, REELS_WIDTH, ReelsView } from '../views/reels/ReelsView';
import { SymbolTextures } from '../views/reels/SymbolTextures';

/**
 * Игровой экран: создаёт view, раскладывает их и связывает с контроллером.
 * Логики игры здесь нет — только «ввод → контроллер» и «модель → отображение».
 *
 * Два уровня раскладки:
 * - background — на всё окно (cover): без полос, края обрезаются;
 * - content — игра в дизайн-координатах 1920×1080 (contain): видна целиком.
 */
export class GameScreen extends Container implements Screen {
    static readonly bundles = ['game'] as const;

    private readonly background = Sprite.from('background');
    private readonly content = new Container();
    private readonly reels: ReelsView;
    private readonly controller: GameController;
    /** Временно: заменит BalancePanel на BitmapText в сессии 3. */
    private readonly infoText = new Text({
        text: '',
        style: { fontFamily: 'Arial', fontSize: 36, fontWeight: 'bold', fill: 0xf5d27a },
    });

    constructor(renderer: Renderer, private readonly model: GameModel, rgs: RgsClient) {
        super();
        this.background.anchor.set(0.5);
        this.addChild(this.background, this.content);

        this.reels = new ReelsView(new SymbolTextures(renderer));
        this.reels.position.set((DESIGN_WIDTH - REELS_WIDTH) / 2, (DESIGN_HEIGHT - REELS_HEIGHT) / 2);
        this.content.addChild(this.reels);

        this.infoText.anchor.set(0.5, 0);
        this.infoText.position.set(DESIGN_WIDTH / 2, this.reels.y + REELS_HEIGHT + 110);
        this.content.addChild(this.infoText);

        // ReelsView подходит под интерфейс GameView (есть setGrid) — контроллер не знает его класс.
        this.controller = new GameController(model, rgs, this.reels);

        // Ввод → контроллер. Временно клик по полю; сессия 3 — кнопка Spin.
        this.reels.eventMode = 'static';
        this.reels.cursor = 'pointer';
        this.reels.on('pointertap', () => void this.controller.spin());

        // Модель → отображение.
        this.model.on('balanceChanged', this.updateInfo, this);
        this.model.on('betChanged', this.updateInfo, this);
    }

    async show(): Promise<void> {
        await this.controller.init();
    }

    resize(width: number, height: number): void {
        const { width: bgWidth, height: bgHeight } = this.background.texture;
        fitCover(this.background, width, height, bgWidth, bgHeight);
        fitContain(this.content, width, height, DESIGN_WIDTH, DESIGN_HEIGHT);
    }

    /**
     * Модель живёт дольше экрана, поэтому подписки на неё снимаем вручную. Иначе после destroy
     * модель продолжит вызывать updateInfo уничтоженного экрана — утечка и ошибки.
     * Аналог off() в onDestroy компонента Cocos.
     */
    override destroy(options?: DestroyOptions): void {
        this.model.off('balanceChanged', this.updateInfo, this);
        this.model.off('betChanged', this.updateInfo, this);
        super.destroy(options);
    }

    private updateInfo(): void {
        this.infoText.text = `BALANCE ${this.model.balance}    BET ${this.model.bet}`;
    }
}
