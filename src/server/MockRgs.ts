// Имитация RGS (Remote Game Server). В реальном слоте клиент только отображает результат,
// а сетку, выигрыши и баланс считает сервер. Здесь то же самое, но локально и с задержкой сети.

import { REEL_COUNT, ROW_COUNT } from '../config/game';
import { BETS, PAYLINES, START_BALANCE, SYMBOL_MATH, WILD, weightedSymbol } from './math';
import type { Grid, InitResult, LineWin, RgsClient, SpinResult } from './RgsClient';

export class MockRgs implements RgsClient {
    private balance = START_BALANCE;

    constructor(private readonly latencyMs = 300) {}

    async init(): Promise<InitResult> {
        await delay(this.latencyMs);
        return { balance: this.balance, grid: randomGrid(), bets: BETS };
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

function randomGrid(): Grid {
    return Array.from({ length: REEL_COUNT }, () =>
        Array.from({ length: ROW_COUNT }, weightedSymbol),
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

        const def = SYMBOL_MATH.find((s) => s.id === target)!;
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
