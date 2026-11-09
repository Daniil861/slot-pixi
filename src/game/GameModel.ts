import EventEmitter from 'eventemitter3';

/** Состояния игры. Stopping и ShowWins появятся вместе с анимацией барабанов и показом выигрышей. */
export type GameState = 'idle' | 'spinning';

/** События модели: имя → аргументы. eventemitter3 проверяет их типы в on/emit. */
interface GameModelEvents {
    balanceChanged: [balance: number];
    betChanged: [bet: number];
    stateChanged: [state: GameState];
}

/**
 * Состояние клиента: баланс, ставка, текущее состояние игры. Без Pixi и без логики сценария.
 * UI подписывается на события и перерисовывается сам: баланс в панели меняется только
 * через модель — так он не может разойтись с тем, что знает игра.
 */
export class GameModel extends EventEmitter<GameModelEvents> {
    private _balance = 0;
    private _state: GameState = 'idle';
    private bets: readonly number[] = [];
    private betIndex = 0;

    get balance(): number {
        return this._balance;
    }

    set balance(value: number) {
        if (value === this._balance) return;
        this._balance = value;
        this.emit('balanceChanged', value);
    }

    get state(): GameState {
        return this._state;
    }

    set state(value: GameState) {
        if (value === this._state) return;
        this._state = value;
        this.emit('stateChanged', value);
    }

    get bet(): number {
        return this.bets[this.betIndex] ?? 0;
    }

    get canSpin(): boolean {
        return this._state === 'idle' && this.bet > 0 && this.bet <= this._balance;
    }

    setBets(bets: readonly number[]): void {
        this.bets = bets;
        this.betIndex = 0;
        this.emit('betChanged', this.bet);
    }

    /** Следующая ставка по кругу. Ставку меняют только в idle. */
    nextBet(): void {
        if (this._state !== 'idle' || this.bets.length === 0) return;
        this.betIndex = (this.betIndex + 1) % this.bets.length;
        this.emit('betChanged', this.bet);
    }
}
