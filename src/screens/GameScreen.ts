import { Container, Sprite, Text, type DestroyOptions, type Renderer, type Ticker } from 'pixi.js';
import { DESIGN_HEIGHT, DESIGN_WIDTH, REELS_HEIGHT, REELS_WIDTH } from '../config/layout';
import { NORMAL_TIMING, TURBO_TIMING } from '../config/reels';
import { fitContain, fitCover } from '../engine/layout';
import type { Screen } from '../engine/Screen';
import { GameController } from '../game/GameController';
import type { GameModel } from '../game/GameModel';
import type { RgsClient } from '../server/RgsClient';
import { ReelsView } from '../views/reels/ReelsView';
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

        this.reels = new ReelsView(new SymbolTextures(renderer), this.currentTiming());
        this.reels.position.set((DESIGN_WIDTH - REELS_WIDTH) / 2, (DESIGN_HEIGHT - REELS_HEIGHT) / 2);
        this.content.addChild(this.reels);

        this.infoText.anchor.set(0.5, 0);
        this.infoText.position.set(DESIGN_WIDTH / 2, this.reels.y + REELS_HEIGHT + 110);
        this.content.addChild(this.infoText);

        // ReelsView подходит под интерфейс GameView — контроллер не знает его класс.
        this.controller = new GameController(model, rgs, this.reels);

        // Ввод → контроллер. Временно клик по полю; сессия 3 — кнопка Spin.
        this.reels.eventMode = 'static';
        this.reels.cursor = 'pointer';
        this.reels.on('pointertap', () => this.controller.pressSpin());

        // Временно: T — переключить turbo. Сессия 3 — кнопка в UI.
        window.addEventListener('keydown', this.onKeyDown);

        // Модель → отображение.
        this.model.on('balanceChanged', this.updateInfo, this);
        this.model.on('betChanged', this.updateInfo, this);
        this.model.on('turboChanged', this.onTurboChanged, this);
    }

    async show(): Promise<void> {
        await this.controller.init();
    }

    /** Вызывается каждый кадр: Navigation подписал этот метод на app.ticker. */
    update(ticker: Ticker): void {
        this.reels.update(ticker.deltaMS);
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
        this.model.off('turboChanged', this.onTurboChanged, this);
        window.removeEventListener('keydown', this.onKeyDown);
        super.destroy(options);
    }

    /** Выбор игрока → пресет таймингов. Сами барабаны о режимах не знают. */
    private currentTiming() {
        return this.model.turbo ? TURBO_TIMING : NORMAL_TIMING;
    }

    private onTurboChanged(): void {
        this.reels.setTiming(this.currentTiming());
        this.updateInfo();
    }

    /** Стрелочная функция-поле: this привязан, и ту же ссылку можно передать в removeEventListener. */
    private readonly onKeyDown = (event: KeyboardEvent): void => {
        if (event.code === 'KeyT') {
            this.model.turbo = !this.model.turbo;
        }
    };

    private updateInfo(): void {
        const turbo = this.model.turbo ? '    TURBO' : '';
        this.infoText.text = `BALANCE ${this.model.balance}    BET ${this.model.bet}${turbo}`;
    }
}
