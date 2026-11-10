import { gsap } from 'gsap';
import { Container, Sprite, type DestroyOptions, type Renderer, type Ticker } from 'pixi.js';
import { DESIGN_HEIGHT, DESIGN_WIDTH, FRAME_BORDER, REELS_HEIGHT, REELS_WIDTH } from '../config/layout';
import { NORMAL_TIMING, TURBO_TIMING } from '../config/reels';
import { NORMAL_WINS_TIMING, SYMBOL_HIGHLIGHT_STYLE, TURBO_WINS_TIMING, WIN_LINES_STYLE } from '../config/wins';
import { fitContain, fitCover } from '../engine/layout';
import type { Screen } from '../engine/Screen';
import { GameController, type GameView } from '../game/GameController';
import type { GameModel, GameState } from '../game/GameModel';
import type { LineWin, RgsClient } from '../server/RgsClient';
import { ReelsView } from '../views/reels/ReelsView';
import { SymbolTextures } from '../views/reels/SymbolTextures';
import { Button } from '../views/ui/Button';
import { installFonts } from '../views/ui/fonts';
import { ValueField } from '../views/ui/ValueField';
import { WinLinesView } from '../views/wins/WinLinesView';
import { WinPresenter } from '../views/wins/WinPresenter';

/** Цвета второстепенных кнопок (Turbo, Bet). */
const SECONDARY_COLORS = { normal: 0x37474f, hover: 0x546e7a, pressed: 0x263238 };

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
    private readonly winLines = new WinLinesView(WIN_LINES_STYLE);
    private readonly winPresenter: WinPresenter;
    private readonly controller: GameController;
    private readonly spinButton = new Button({ width: 240, height: 140, text: 'SPIN', fontSize: 52 });
    private readonly turboButton = new Button({ width: 200, height: 80, text: 'TURBO', fontSize: 32, colors: SECONDARY_COLORS });
    private readonly betButton = new Button({ width: 200, height: 80, text: 'BET', fontSize: 32, colors: SECONDARY_COLORS });
    // Поля создаются в конструкторе: до первого BitmapText должен быть установлен шрифт.
    private readonly balanceField: ValueField;
    private readonly winField: ValueField;
    private readonly betField: ValueField;
    /** Пауза после докрутки счётчика: все выигрышные линии ещё на экране. */
    private winHold: gsap.core.Tween | undefined;
    private finishWinHold: (() => void) | undefined;
    private winsSkipped = false;

    constructor(renderer: Renderer, private readonly model: GameModel, rgs: RgsClient) {
        super();
        this.background.anchor.set(0.5);
        this.addChild(this.background, this.content);

        this.reels = new ReelsView(new SymbolTextures(renderer), this.currentTiming(), SYMBOL_HIGHLIGHT_STYLE);
        this.reels.position.set((DESIGN_WIDTH - REELS_WIDTH) / 2, (DESIGN_HEIGHT - REELS_HEIGHT) / 2);
        this.content.addChild(this.reels);
        // Линии — поверх рамки (добавлены позже), в координатах окна барабанов.
        this.winLines.position.copyFrom(this.reels.position);
        this.content.addChild(this.winLines);
        this.winPresenter = new WinPresenter(this.reels, this.winLines, this.currentWinsTiming());

        // Шрифт — до первого BitmapText с этим fontFamily. Иначе Pixi сгенерирует динамический шрифт
        // из стиля BitmapText, а системного шрифта 'UiFont' нет — получится шрифт по умолчанию.
        installFonts();
        this.balanceField = new ValueField({ title: 'BALANCE' });
        this.winField = new ValueField({ title: 'WIN', valueSize: 56, valueColor: 0xf5d27a });
        this.betField = new ValueField({ title: 'BET' });
        // Панель под рамкой: баланс слева, выигрыш по центру, ставка справа.
        const panelY = this.reels.y + REELS_HEIGHT + FRAME_BORDER + 20;
        this.balanceField.position.set(this.reels.x + REELS_WIDTH * 0.15, panelY);
        this.winField.position.set(this.reels.x + REELS_WIDTH * 0.5, panelY);
        this.betField.position.set(this.reels.x + REELS_WIDTH * 0.85, panelY);
        this.content.addChild(this.balanceField, this.winField, this.betField);

        // GameView собирается из нескольких view: контроллер не знает, кто что показывает.
        const view: GameView = {
            setPaylines: (paylines) => this.winLines.setPaylines(paylines),
            setGrid: (grid) => this.reels.setGrid(grid),
            startSpin: () => {
                this.winPresenter.clear();
                this.reels.startSpin();
            },
            stopOn: (grid) => this.reels.stopOn(grid),
            quickStop: () => this.reels.quickStop(),
            showWins: (wins, totalWin) => this.showWins(wins, totalWin),
            skipWins: () => this.skipWins(),
        };
        this.controller = new GameController(model, rgs, view);

        // Кнопки справа от поля, по центру свободной полосы между рамкой и краем дизайн-области.
        const columnX = (this.reels.x + REELS_WIDTH + FRAME_BORDER + DESIGN_WIDTH) / 2;
        this.spinButton.position.set(columnX, DESIGN_HEIGHT / 2);
        this.turboButton.position.set(columnX, DESIGN_HEIGHT / 2 + 160);
        this.betButton.position.set(columnX, DESIGN_HEIGHT / 2 + 260);
        this.content.addChild(this.spinButton, this.turboButton, this.betButton);

        // Ввод → контроллер / модель. Кнопка не решает, можно ли крутить: это проверяет контроллер.
        this.spinButton.onPress = () => this.controller.pressSpin();
        this.turboButton.onPress = () => (this.model.turbo = !this.model.turbo);
        this.betButton.onPress = () => this.model.nextBet();

        // Модель → отображение.
        this.model.on('balanceChanged', this.onBalanceChanged, this);
        this.model.on('betChanged', this.onBetChanged, this);
        this.model.on('winChanged', this.onWinChanged, this);
        this.model.on('turboChanged', this.onTurboChanged, this);
        this.model.on('stateChanged', this.updateButtons, this);
        this.updateButtons();
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
     * модель продолжит вызывать обработчики уничтоженного экрана — утечка и ошибки.
     * Аналог off() в onDestroy компонента Cocos.
     */
    override destroy(options?: DestroyOptions): void {
        this.model.off('balanceChanged', this.onBalanceChanged, this);
        this.model.off('betChanged', this.onBetChanged, this);
        this.model.off('winChanged', this.onWinChanged, this);
        this.model.off('turboChanged', this.onTurboChanged, this);
        this.model.off('stateChanged', this.updateButtons, this);
        this.winHold?.kill();
        this.winPresenter.destroy();
        super.destroy(options);
    }

    /** Выбор игрока → пресет таймингов. Сами барабаны и показ выигрыша о режимах не знают. */
    private currentTiming() {
        return this.model.turbo ? TURBO_TIMING : NORMAL_TIMING;
    }

    private currentWinsTiming() {
        return this.model.turbo ? TURBO_WINS_TIMING : NORMAL_WINS_TIMING;
    }

    private onTurboChanged(): void {
        this.reels.setTiming(this.currentTiming());
        this.winPresenter.setTiming(this.currentWinsTiming());
        this.turboButton.text = this.model.turbo ? 'TURBO ON' : 'TURBO';
    }

    /** Баланс показываем сразу: и списание ставки, и начисление после показа выигрыша — без прокрутки. */
    private onBalanceChanged(balance: number): void {
        void this.balanceField.setValue(balance);
        this.updateButtons();
    }

    private onBetChanged(bet: number): void {
        void this.betField.setValue(bet);
        this.updateButtons();
    }

    /** Обнуление на старте спина — сразу. Рост до выигрыша докручивает showWins: ему нужен момент окончания. */
    private onWinChanged(win: number): void {
        if (win === 0) void this.winField.setValue(0);
    }

    /**
     * Spin — одна кнопка, три смысла (см. GameController.pressSpin). В idle она выключена, если крутить нельзя
     * (ставка больше баланса); в остальных состояниях всегда доступна: STOP — quick stop, SKIP — пропуск выигрыша.
     * Ставку меняют только в idle.
     */
    private updateButtons(): void {
        const texts: Record<GameState, string> = { idle: 'SPIN', spinning: 'STOP', stopping: 'STOP', showWins: 'SKIP' };
        const state = this.model.state;
        this.spinButton.text = texts[state];
        this.spinButton.enabled = state !== 'idle' || this.model.canSpin;
        this.betButton.enabled = state === 'idle';
    }

    /**
     * Показ выигрыша: все линии и символы сразу, счётчик WIN докручивается от 0, затем короткая пауза.
     * Skip на любом этапе — счётчик сразу в конечное значение, показ заканчивается.
     * После показа (и после skip) линии перебираются по одной до следующего спина — это уже idle.
     */
    private async showWins(wins: readonly LineWin[], totalWin: number): Promise<void> {
        this.winsSkipped = false;
        this.winPresenter.showAll(wins);
        try {
            await this.playWinCounter(totalWin);
        } finally {
            this.winPresenter.startCycle(wins);
        }
    }

    private async playWinCounter(totalWin: number): Promise<void> {
        const { counterSec, holdSec } = this.currentWinsTiming();
        await this.winField.setValue(totalWin, counterSec);
        if (this.winsSkipped) return;
        // Пауза — gsap.delayedCall, а не setTimeout: GSAP идёт от app.ticker и стоит вместе с игрой.
        await new Promise<void>((resolve) => {
            this.finishWinHold = () => {
                this.winHold?.kill();
                this.winHold = undefined;
                this.finishWinHold = undefined;
                resolve();
            };
            this.winHold = gsap.delayedCall(holdSec, this.finishWinHold);
        });
    }

    private skipWins(): void {
        this.winsSkipped = true;
        this.winField.finish();
        this.finishWinHold?.();
    }
}
