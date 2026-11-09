// Имитация RGS (Remote Game Server). В реальном слоте клиент только отображает результат,
// а сетку, выигрыши и баланс считает сервер. Здесь то же самое, но локально и с задержкой сети.

import {
    PAYLINES, REEL_COUNT, ROW_COUNT, START_BALANCE, SYMBOLS, WILD,
    type SymbolId,
} from '../config/gameConfig';

/** grid[reel][row] — символы видимого окна, как их надо показать на барабанах. */
export type Grid = SymbolId[][];

export interface LineWin {
    lineIndex: number;
    symbol: SymbolId;
    count: number;
    amount: number;
    /** Позиции выигрышных символов: [reel, row]. */
    positions: [reel: number, row: number][];
}

export interface SpinResult {
    grid: Grid;
    wins: LineWin[];
    totalWin: number;
    /** Баланс после списания ставки и начисления выигрыша. */
    balance: number;
}

export class MockRgs {
    private balance = START_BALANCE;

    constructor(private readonly latencyMs = 300) {}

    getBalance(): number {
        return this.balance;
    }

    async spin(bet: number): Promise<SpinResult> {
        if (bet <= 0 || bet > this.balance) {
            throw new Error(`Invalid bet ${bet}, balance ${this.balance}`);
        }
        await delay(this.latencyMs);

        this.balance -= bet;
        const grid = randomGrid();
        const lineBet = bet / PAYLINES.length;
        const wins = evaluate(grid, lineBet);
        const totalWin = wins.reduce((sum, w) => sum + w.amount, 0);
        this.balance += totalWin;

        return { grid, wins, totalWin, balance: this.balance };
    }
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);

/** Случайный символ с учетом весов. Также пригодится клиенту для «шума» на крутящейся ленте. */
export function randomSymbol(): SymbolId {
    let r = Math.random() * TOTAL_WEIGHT;
    for (const s of SYMBOLS) {
        r -= s.weight;
        if (r < 0) return s.id;
    }
    return SYMBOLS[0]!.id;
}

function randomGrid(): Grid {
    return Array.from({ length: REEL_COUNT }, () =>
        Array.from({ length: ROW_COUNT }, randomSymbol),
    );
}

function evaluate(grid: Grid, lineBet: number): LineWin[] {
    const wins: LineWin[] = [];

    PAYLINES.forEach((line, lineIndex) => {
        const symbols = line.map((row, reel) => grid[reel]![row]!);

        // Символ линии — первый не-wild слева; если вся линия из wild, платит wild.
        const target = symbols.find((s) => s !== WILD) ?? WILD;

        let count = 0;
        while (count < symbols.length && (symbols[count] === target || symbols[count] === WILD)) {
            count++;
        }
        if (count < 3) return;

        const def = SYMBOLS.find((s) => s.id === target)!;
        const amount = def.pays[count - 3]! * lineBet;
        wins.push({
            lineIndex,
            symbol: target,
            count,
            amount,
            positions: line.slice(0, count).map((row, reel) => [reel, row]),
        });
    });

    return wins;
}
