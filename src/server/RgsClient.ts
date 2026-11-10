// Контракт клиента с сервером (RGS — Remote Game Server). Игра знает только этот интерфейс:
// MockRgs можно заменить на HttpRgsClient (fetch/WebSocket к настоящему серверу), не трогая game/ и views/.

import type { SymbolId } from '../config/game';

/** grid[reel][row] — символы видимого окна, как их надо показать на барабанах. */
export type Grid = SymbolId[][];

/** Линия выплат: для каждого барабана — индекс ряда (0 — верхний). */
export type Payline = readonly number[];

export interface LineWin {
    lineIndex: number;
    symbol: SymbolId;
    count: number;
    amount: number;
    /** Позиции выигрышных символов: [reel, row]. */
    positions: [reel: number, row: number][];
}

/** Ответ на вход в игру: с чего начать показ. */
export interface InitResult {
    balance: number;
    /** Сетка, которую игрок видит до первого спина (обычно последний результат сессии). */
    grid: Grid;
    bets: readonly number[];
    /** Форма линий — чтобы клиент мог их нарисовать. Выплаты по ним считает только сервер. */
    paylines: readonly Payline[];
}

export interface SpinResult {
    grid: Grid;
    wins: LineWin[];
    totalWin: number;
    /** Баланс после списания ставки и начисления выигрыша — источник правды для клиента. */
    balance: number;
}

export interface RgsClient {
    init(): Promise<InitResult>;
    spin(bet: number): Promise<SpinResult>;
}
