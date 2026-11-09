// Математика игры — только на сервере. В реальном продукте это закрытая часть RGS,
// которую проходит сертификация. Клиент получает из неё только то, что нужно показать (через InitResult).

import type { SymbolId } from '../config/game';

export interface SymbolMath {
    id: SymbolId;
    /** Вес при генерации: чем больше, тем чаще выпадает. */
    weight: number;
    /** Выплата (множитель ставки на линию) за 3, 4 и 5 символов подряд. */
    pays: [three: number, four: number, five: number];
}

export const SYMBOL_MATH: readonly SymbolMath[] = [
    { id: '10', weight: 30, pays: [5, 10, 25] },
    { id: 'j', weight: 30, pays: [5, 10, 25] },
    { id: 'queen', weight: 26, pays: [5, 15, 30] },
    { id: 'king', weight: 24, pays: [5, 15, 40] },
    { id: 'ace', weight: 22, pays: [10, 20, 50] },
    { id: 'high1', weight: 12, pays: [10, 30, 100] },
    { id: 'high2', weight: 10, pays: [15, 50, 150] },
    { id: 'high3', weight: 8, pays: [20, 75, 250] },
    // wild заменяет любой символ; линия из одних wild платит по своей таблице
    { id: 'wild', weight: 5, pays: [25, 100, 500] },
];

export const WILD: SymbolId = 'wild';

/**
 * Линии выплат: для каждого барабана — индекс ряда (0 — верхний).
 * Выигрыш считается слева направо, от первого барабана.
 */
export const PAYLINES: readonly (readonly number[])[] = [
    [1, 1, 1, 1, 1], // середина
    [0, 0, 0, 0, 0], // верх
    [2, 2, 2, 2, 2], // низ
    [0, 1, 2, 1, 0], // V
    [2, 1, 0, 1, 2], // перевернутая V
    [0, 0, 1, 2, 2],
    [2, 2, 1, 0, 0],
    [1, 0, 0, 0, 1],
    [1, 2, 2, 2, 1],
    [0, 1, 1, 1, 0],
];

export const BETS: readonly number[] = [10, 20, 50, 100];
export const START_BALANCE = 1000;

const TOTAL_WEIGHT = SYMBOL_MATH.reduce((sum, s) => sum + s.weight, 0);

/** Случайный символ с учётом весов — определяет результат спина. */
export function weightedSymbol(): SymbolId {
    let r = Math.random() * TOTAL_WEIGHT;
    for (const s of SYMBOL_MATH) {
        r -= s.weight;
        if (r < 0) return s.id;
    }
    return SYMBOL_MATH[0]!.id;
}
