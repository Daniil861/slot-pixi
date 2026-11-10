import type { Grid, LineWin, Payline, RgsClient, SpinResult } from '../server/RgsClient';
import type { GameModel } from './GameModel';

/**
 * Что контроллеру нужно от отображения. Контроллер не знает Pixi и конкретные классы view:
 * GameScreen собирает этот объект из своих view (барабаны, линии, поле выигрыша).
 */
export interface GameView {
    /** Форма линий выплат из InitResult — для их отрисовки. */
    setPaylines(paylines: readonly Payline[]): void;
    /** Показать сетку сразу, без анимации. */
    setGrid(grid: Grid): void;
    /** Запустить вращение. Вызывается до запроса к серверу — игрок не ждёт сеть. */
    startSpin(): void;
    /** Остановить вращение на сетке. Промис завершается, когда барабаны встали. */
    stopOn(grid: Grid): Promise<void>;
    /** Остановить как можно быстрее (повторное нажатие во время вращения). */
    quickStop(): void;
    /** Показать выигрыш спина. Промис завершается, когда показ закончен или пропущен. */
    showWins(wins: readonly LineWin[], totalWin: number): Promise<void>;
    /** Пропустить показ выигрыша (нажатие во время showWins). */
    skipWins(): void;
}

/**
 * Сценарий игры: что происходит и в каком порядке. Связывает сервер, модель и отображение.
 * Аналог «GameManager»-компонента в Cocos, но без привязки к узлу сцены.
 */
export class GameController {
    constructor(
        private readonly model: GameModel,
        private readonly rgs: RgsClient,
        private readonly view: GameView,
    ) {}

    /** Последняя показанная сетка: на неё останавливаемся, если спин не удался. */
    private lastGrid: Grid = [];

    /** Вход в игру: баланс, ставки и начальная сетка приходят с сервера. */
    async init(): Promise<void> {
        const result = await this.rgs.init();
        this.model.setBets(result.bets);
        this.model.balance = result.balance;
        this.lastGrid = result.grid;
        this.view.setPaylines(result.paylines);
        this.view.setGrid(result.grid);
    }

    /**
     * Нажатие кнопки спина (сейчас — клик по полю). Одна кнопка, смысл зависит от состояния:
     * idle — новый спин; spinning / stopping — quick stop; showWins — пропустить показ выигрыша.
     */
    pressSpin(): void {
        switch (this.model.state) {
            case 'idle':
                void this.spin();
                break;
            case 'spinning':
            case 'stopping':
                this.view.quickStop();
                break;
            case 'showWins':
                this.view.skipWins();
                break;
        }
    }

    async spin(): Promise<void> {
        // Защита от двойного клика и ставки больше баланса: проверка в одном месте, а не в кнопке.
        if (!this.model.canSpin) return;

        const bet = this.model.bet;
        this.model.state = 'spinning';
        this.model.win = 0;
        // Ставку списываем сразу, не дожидаясь сервера: игрок должен видеть списание в момент нажатия.
        this.model.balance -= bet;
        // Барабаны крутятся сразу, параллельно с запросом: задержка сети прячется в анимации.
        this.view.startSpin();

        // try только вокруг запроса: ошибка в анимации не должна возвращать ставку — сервер спин уже провёл.
        let result: SpinResult;
        try {
            result = await this.rgs.spin(bet);
        } catch (error) {
            // Спин не состоялся — возвращаем ставку. В реальной игре — окно ошибки и повторный init.
            this.model.balance += bet;
            console.error('[GameController] spin failed', error);
            await this.view.stopOn(this.lastGrid);
            this.model.state = 'idle';
            return;
        }

        this.lastGrid = result.grid;
        // Результат есть, барабаны садятся. Отдельное состояние: UI может, например,
        // показать кнопку Stop как неактивную, а логика — не принимать новую ставку.
        this.model.state = 'stopping';
        await this.view.stopOn(result.grid);

        if (result.totalWin > 0) {
            this.model.state = 'showWins';
            this.model.win = result.totalWin;
            await this.view.showWins(result.wins, result.totalWin);
        }
        // Итоговый баланс берём с сервера, а не считаем сами: сервер — источник правды.
        // Начисляем после показа: игрок сначала видит выигрыш, потом он «переезжает» в баланс.
        this.model.balance = result.balance;
        this.model.state = 'idle';
    }
}
