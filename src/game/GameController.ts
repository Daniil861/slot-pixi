import type { Grid, RgsClient } from '../server/RgsClient';
import type { GameModel } from './GameModel';

/**
 * Что контроллеру нужно от отображения. Контроллер не знает Pixi и конкретные классы view:
 * GameScreen передаёт объект, который умеет это делать (сейчас — ReelsView).
 * Сессия 2: появятся startSpin() и stopOn(grid): Promise<void>; сессия 3 — showWins(wins).
 */
export interface GameView {
    setGrid(grid: Grid): void;
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

    /** Вход в игру: баланс, ставки и начальная сетка приходят с сервера. */
    async init(): Promise<void> {
        const result = await this.rgs.init();
        this.model.setBets(result.bets);
        this.model.balance = result.balance;
        this.view.setGrid(result.grid);
    }

    async spin(): Promise<void> {
        // Защита от двойного клика и ставки больше баланса: проверка в одном месте, а не в кнопке.
        if (!this.model.canSpin) return;

        const bet = this.model.bet;
        this.model.state = 'spinning';
        // Ставку списываем сразу, не дожидаясь сервера: игрок должен видеть списание в момент нажатия.
        this.model.balance -= bet;

        try {
            const result = await this.rgs.spin(bet);
            this.view.setGrid(result.grid);
            // Итоговый баланс берём с сервера, а не считаем сами: сервер — источник правды.
            // Сессия 3: сначала показ выигрыша и счётчик, потом баланс.
            this.model.balance = result.balance;
            console.log('win:', result.totalWin, 'balance:', result.balance, result.wins);
        } catch (error) {
            // Спин не состоялся — возвращаем ставку. В реальной игре — окно ошибки и повторный init.
            this.model.balance += bet;
            console.error('[GameController] spin failed', error);
        } finally {
            this.model.state = 'idle';
        }
    }
}
