import { gsap } from 'gsap';
import { Assets, Container, Sprite, type DestroyOptions, type Renderer, type Ticker } from 'pixi.js';
import { GameAudio } from '../audio/GameAudio';
import { AUDIO } from '../config/audio';
import {
    BUTTON_COLUMN_Y,
    DESIGN_HEIGHT,
    DESIGN_WIDTH,
    FRAME_BORDER,
    PANEL_FIELD_X,
    PANEL_GAP,
    REELS_HEIGHT,
    REELS_WIDTH,
} from '../config/layout';
import { NORMAL_TIMING, TURBO_TIMING } from '../config/reels';
import { SYMBOL_SPINE } from '../config/spine';
import { PRIMARY_BUTTON, SECONDARY_BUTTON, SYMBOL_PLACEHOLDER, UI_FONT, VALUE_FIELD, WIN_FIELD } from '../config/ui';
import {
    NORMAL_WINS_TIMING,
    SYMBOL_HIGHLIGHT_STYLE,
    TURBO_WINS_TIMING,
    WIN_LINES_STYLE,
} from '../config/wins';
import { fitContain, fitCover } from '../engine/layout';
import type { Screen } from '../engine/Screen';
import { GameController, type GameView } from '../game/GameController';
import type { GameModel, GameState } from '../game/GameModel';
import type { LineWin, RgsClient } from '../server/RgsClient';
import { ReelsView } from '../views/reels/ReelsView';
import { SymbolTextures } from '../views/reels/SymbolTextures';
import { Button } from '../views/ui/Button';
import { installBitmapFont } from '../views/ui/fonts';
import { ValueField } from '../views/ui/ValueField';
import { WinLinesView } from '../views/wins/WinLinesView';
import { WinPresenter } from '../views/wins/WinPresenter';
import { WinSymbolsView } from '../views/wins/WinSymbolsView';

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
    private readonly winSymbols = new WinSymbolsView(SYMBOL_SPINE);
    private readonly winLines = new WinLinesView(WIN_LINES_STYLE);
    private readonly winPresenter: WinPresenter;
    private readonly controller: GameController;
    private readonly spinButton = new Button(PRIMARY_BUTTON, 'SPIN');
    private readonly turboButton = new Button(SECONDARY_BUTTON, 'TURBO');
    private readonly betButton = new Button(SECONDARY_BUTTON, 'BET');
    private readonly soundButton = new Button(SECONDARY_BUTTON, 'SOUND');
    private readonly audio = new GameAudio(AUDIO);
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

        this.reels = new ReelsView(new SymbolTextures(renderer, SYMBOL_PLACEHOLDER), this.currentTiming(), SYMBOL_HIGHLIGHT_STYLE);
        this.reels.position.set((DESIGN_WIDTH - REELS_WIDTH) / 2, (DESIGN_HEIGHT - REELS_HEIGHT) / 2);
        this.content.addChild(this.reels);
        // Поверх барабанов и рамки (порядок addChild), в координатах окна барабанов:
        // Spine выигрышных символов, над ними — линии.
        this.winSymbols.position.copyFrom(this.reels.position);
        this.winLines.position.copyFrom(this.reels.position);
        this.content.addChild(this.winSymbols, this.winLines);
        this.winPresenter = new WinPresenter(this.reels, this.winLines, this.winSymbols, this.currentWinsTiming());

        // Шрифт — до первого BitmapText с этим fontFamily. Иначе Pixi сгенерирует динамический шрифт
        // из стиля BitmapText, а системного шрифта с таким именем нет — получится шрифт по умолчанию.
        installBitmapFont(UI_FONT);
        this.balanceField = new ValueField(VALUE_FIELD, 'BALANCE');
        this.winField = new ValueField(WIN_FIELD, 'WIN');
        this.betField = new ValueField(VALUE_FIELD, 'BET');
        // Панель под рамкой: баланс слева, выигрыш по центру, ставка справа.
        const panelY = this.reels.y + REELS_HEIGHT + FRAME_BORDER + PANEL_GAP;
        this.balanceField.position.set(this.reels.x + REELS_WIDTH * PANEL_FIELD_X.balance, panelY);
        this.winField.position.set(this.reels.x + REELS_WIDTH * PANEL_FIELD_X.win, panelY);
        this.betField.position.set(this.reels.x + REELS_WIDTH * PANEL_FIELD_X.bet, panelY);
        this.content.addChild(this.balanceField, this.winField, this.betField);

        // GameView собирается из нескольких view: контроллер не знает, кто что показывает.
        const view: GameView = {
            setPaylines: (paylines) => this.winLines.setPaylines(paylines),
            setGrid: (grid) => this.reels.setGrid(grid),
            startSpin: () => {
                this.winPresenter.clear();
                this.reels.startSpin();
                this.audio.spinStarted();
            },
            stopOn: async (grid) => {
                await this.reels.stopOn(grid);
                this.audio.spinFinished();
            },
            quickStop: () => this.reels.quickStop(),
            showWins: (wins, totalWin) => this.showWins(wins, totalWin),
            skipWins: () => this.skipWins(),
        };
        this.controller = new GameController(model, rgs, view);

        // Кнопки справа от поля, по центру свободной полосы между рамкой и краем дизайн-области.
        const columnX = (this.reels.x + REELS_WIDTH + FRAME_BORDER + DESIGN_WIDTH) / 2;
        this.spinButton.position.set(columnX, BUTTON_COLUMN_Y.spin);
        this.turboButton.position.set(columnX, BUTTON_COLUMN_Y.turbo);
        this.betButton.position.set(columnX, BUTTON_COLUMN_Y.bet);
        this.soundButton.position.set(columnX, BUTTON_COLUMN_Y.sound);
        this.content.addChild(this.spinButton, this.turboButton, this.betButton, this.soundButton);

        // Ввод → контроллер / модель. Кнопка не решает, можно ли крутить: это проверяет контроллер.
        this.spinButton.onPress = () => this.controller.pressSpin();
        this.turboButton.onPress = () => (this.model.turbo = !this.model.turbo);
        this.betButton.onPress = () => this.model.nextBet();
        this.soundButton.onPress = () => (this.model.muted = !this.model.muted);

        // Отображение → звук: моменты, которые знают только view.
        this.reels.onReelStop = () => this.audio.reelStopped();
        // Звук выигрыша — только на показе всех линий; при переборе линий WinPresenter его не отдаёт.
        this.winPresenter.onWinImpact = () => this.audio.winImpact();

        // Модель → отображение.
        this.model.on('balanceChanged', this.onBalanceChanged, this);
        this.model.on('betChanged', this.onBetChanged, this);
        this.model.on('winChanged', this.onWinChanged, this);
        this.model.on('turboChanged', this.onTurboChanged, this);
        this.model.on('stateChanged', this.updateButtons, this);
        this.model.on('mutedChanged', this.onMutedChanged, this);
        this.updateButtons();
        this.onTurboChanged();
        this.onMutedChanged();
    }

    async show(): Promise<void> {
        await this.controller.init();
        // Музыку не ждём: бандл грузится, пока игрок уже крутит. Промис loadBundle без await — загрузка
        // идёт параллельно (Assets.backgroundLoadBundle — то же, но с низким приоритетом, «про запас»).
        void Assets.loadBundle(AUDIO.musicBundle).then(() => {
            if (!this.destroyed) this.audio.startMusic();
        });
    }

    /** Вызывается каждый кадр: Navigation подписал этот метод на app.ticker. */
    update(ticker: Ticker): void {
        this.reels.update(ticker.deltaMS);
        this.winSymbols.update(ticker.deltaMS / 1000);
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
        this.model.off('mutedChanged', this.onMutedChanged, this);
        this.audio.destroy();
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

    private onMutedChanged(): void {
        this.audio.setMuted(this.model.muted);
        this.soundButton.text = this.model.muted ? 'SOUND OFF' : 'SOUND';
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
