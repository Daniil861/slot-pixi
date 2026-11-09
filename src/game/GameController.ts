import type { Grid, RgsClient } from '../server/RgsClient';
import type { GameModel } from './GameModel';

/**
 * Что контроллеру нужно от отображения. Контроллер не знает Pixi и конкретные классы view:
 * GameScreen передаёт объект, который умеет это делать (сейчас — ReelsView).
 * Сессия 3: появится showWins(wins).
 */
export interface GameView {
    /** Показать сетку сразу, без анимации. */
    setGrid(grid: Grid): void;
    /** Запустить вращение. Вызывается до запроса к серверу — игрок не ждёт сеть. */
    startSpin(): void;
    /** Остановить вращение на сетке. Промис завершается, когда барабаны встали. */
    stopOn(grid: Grid): Promise<void>;
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
        this.view.setGrid(result.grid);
    }

    async spin(): Promise<void> {
        // Защита от двойного клика и ставки больше баланса: проверка в одном месте, а не в кнопке.
        if (!this.model.canSpin) return;

        const bet = this.model.bet;
        this.model.state = 'spinning';
        // Ставку списываем сразу, не дожидаясь сервера: игрок должен видеть списание в момент нажатия.
        this.model.balance -= bet;
        // Барабаны крутятся сразу, параллельно с запросом: задержка сети прячется в анимации.
        this.view.startSpin();

        try {
            const result = await this.rgs.spin(bet);
            this.lastGrid = result.grid;
            await this.view.stopOn(result.grid);
            // Итоговый баланс берём с сервера, а не считаем сами: сервер — источник правды.
            // Сессия 3: сначала показ выигрыша и счётчик, потом баланс.
            this.model.balance = result.balance;
            console.log('win:', result.totalWin, 'balance:', result.balance, result.wins);
        } catch (error) {
            // Спин не состоялся — возвращаем ставку. В реальной игре — окно ошибки и повторный init.
            this.model.balance += bet;
            console.error('[GameController] spin failed', error);
            await this.view.stopOn(this.lastGrid);
        } finally {
            this.model.state = 'idle';
        }
    }
}
