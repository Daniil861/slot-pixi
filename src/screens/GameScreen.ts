import { gsap } from 'gsap';
import { Container, Sprite, Text, type DestroyOptions, type Renderer, type Ticker } from 'pixi.js';
import { DESIGN_HEIGHT, DESIGN_WIDTH, FRAME_BORDER, REELS_HEIGHT, REELS_WIDTH } from '../config/layout';
import { NORMAL_TIMING, TURBO_TIMING } from '../config/reels';
import { fitContain, fitCover } from '../engine/layout';
import type { Screen } from '../engine/Screen';
import { GameController, type GameView } from '../game/GameController';
import type { GameModel, GameState } from '../game/GameModel';
import type { LineWin, RgsClient } from '../server/RgsClient';
import { ReelsView } from '../views/reels/ReelsView';
import { Button } from '../views/ui/Button';
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
    private readonly spinButton = new Button({ width: 240, height: 140, text: 'SPIN', fontSize: 52 });
    private readonly turboButton = new Button({
        width: 200,
        height: 80,
        text: 'TURBO',
        fontSize: 32,
        colors: { normal: 0x37474f, hover: 0x546e7a, pressed: 0x263238 },
    });
    /** Временно: заменит BalancePanel на BitmapText в сессии 3. */
    private readonly infoText = new Text({
        text: '',
        style: { fontFamily: 'Arial', fontSize: 36, fontWeight: 'bold', fill: 0xf5d27a },
    });
    /** Временно: пауза показа выигрыша. Заменят линии и счётчик (шаги 3–4 сессии 3). */
    private winPause: gsap.core.Tween | undefined;
    private finishWins: (() => void) | undefined;

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

        // GameView собирается из нескольких view: контроллер не знает, кто что показывает.
        const view: GameView = {
            setGrid: (grid) => this.reels.setGrid(grid),
            startSpin: () => this.reels.startSpin(),
            stopOn: (grid) => this.reels.stopOn(grid),
            quickStop: () => this.reels.quickStop(),
            showWins: (wins, totalWin) => this.showWins(wins, totalWin),
            skipWins: () => this.skipWins(),
        };
        this.controller = new GameController(model, rgs, view);

        // Кнопки справа от поля, по центру свободной полосы между рамкой и краем дизайн-области.
        const panelX = (this.reels.x + REELS_WIDTH + FRAME_BORDER + DESIGN_WIDTH) / 2;
        this.spinButton.position.set(panelX, DESIGN_HEIGHT / 2);
        this.turboButton.position.set(panelX, DESIGN_HEIGHT / 2 + 160);
        this.content.addChild(this.spinButton, this.turboButton);

        // Ввод → контроллер / модель. Кнопка не решает, можно ли крутить: это проверяет контроллер.
        this.spinButton.onPress = () => this.controller.pressSpin();
        this.turboButton.onPress = () => (this.model.turbo = !this.model.turbo);

        // Модель → отображение.
        this.model.on('balanceChanged', this.updateInfo, this);
        this.model.on('betChanged', this.updateInfo, this);
        this.model.on('turboChanged', this.onTurboChanged, this);
        this.model.on('winChanged', this.updateInfo, this);
        this.model.on('stateChanged', this.updateSpinButton, this);
        this.model.on('balanceChanged', this.updateSpinButton, this);
        this.model.on('betChanged', this.updateSpinButton, this);
        this.updateSpinButton();
        this.onTurboChanged();
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
        this.model.off('winChanged', this.updateInfo, this);
        this.model.off('stateChanged', this.updateSpinButton, this);
        this.model.off('balanceChanged', this.updateSpinButton, this);
        this.model.off('betChanged', this.updateSpinButton, this);
        this.winPause?.kill();
        super.destroy(options);
    }

    /** Выбор игрока → пресет таймингов. Сами барабаны о режимах не знают. */
    private currentTiming() {
        return this.model.turbo ? TURBO_TIMING : NORMAL_TIMING;
    }

    private onTurboChanged(): void {
        this.reels.setTiming(this.currentTiming());
        this.turboButton.text = this.model.turbo ? 'TURBO ON' : 'TURBO';
        this.updateInfo();
    }

    /**
     * Одна кнопка — три смысла (см. GameController.pressSpin). В idle она выключена, если крутить нельзя
     * (ставка больше баланса); в остальных состояниях всегда доступна: STOP — quick stop, SKIP — пропуск выигрыша.
     */
    private updateSpinButton(): void {
        const texts: Record<GameState, string> = { idle: 'SPIN', spinning: 'STOP', stopping: 'STOP', showWins: 'SKIP' };
        const state = this.model.state;
        this.spinButton.text = texts[state];
        this.spinButton.enabled = state !== 'idle' || this.model.canSpin;
    }

    /**
     * Временный показ выигрыша: строка WIN в infoText и пауза. Пауза — gsap.delayedCall, а не setTimeout:
     * GSAP обновляется из app.ticker, поэтому на неактивной вкладке пауза стоит вместе с игрой.
     */
    private showWins(wins: readonly LineWin[], totalWin: number): Promise<void> {
        console.log('win:', totalWin, wins);
        return new Promise((resolve) => {
            this.finishWins = () => {
                this.winPause?.kill();
                this.winPause = undefined;
                this.finishWins = undefined;
                resolve();
            };
            this.winPause = gsap.delayedCall(this.model.turbo ? 0.6 : 1.5, this.finishWins);
        });
    }

    private skipWins(): void {
        this.finishWins?.();
    }

    private updateInfo(): void {
        const win = this.model.win > 0 ? `    WIN ${this.model.win}` : '';
        this.infoText.text = `BALANCE ${this.model.balance}    BET ${this.model.bet}${win}`;
    }
}
