import { Container, Sprite } from 'pixi.js';
import { CELL_SIZE, ROW_COUNT, SYMBOL_SIZE, randomSymbol, type SymbolId } from '../../config/gameConfig';
import type { SymbolTextures } from './SymbolTextures';

/**
 * Спрайтов на ленте: по одному скрытому над и под окном + видимые ряды.
 * Нижний скрытый нужен для крупных символов, которые выступают за свою ячейку:
 * его верхняя часть может заходить в последний видимый ряд, и там должен быть реальный символ, а не пустота.
 */
const STRIP_LENGTH = ROW_COUNT + 2;

/**
 * Один барабан — лента из STRIP_LENGTH спрайтов, которые ходят по кругу.
 *
 * Состояние ленты — одно число `offset` (в ячейках). Положение каждого спрайта вычисляется из него:
 *   слот = (индекс + offset) mod STRIP_LENGTH; y = (слот − 1) · CELL_SIZE + CELL_SIZE / 2.
 * Слот 0 — над окном, слоты 1..ROW_COUNT — видимые ряды сверху вниз, последний слот — под окном.
 * Оба крайних слота после остановки скрыты маской.
 * Целый offset — символы стоят ровно в ячейках; дробный — лента между ними.
 * Вращение (шаг 2) — это просто рост offset: спрайты едут вниз, нижний скрытый переходит в слот 0.
 *
 * Локальные координаты: (0, 0) — левый верхний угол ячейки первого ряда, ширина CELL_SIZE.
 */
export class Reel extends Container {
    private readonly sprites: Sprite[] = [];
    /** Не `position`: это имя уже занято у Container (координаты объекта). */
    private offset = 0;

    constructor(private readonly textures: SymbolTextures) {
        super();
        for (let i = 0; i < STRIP_LENGTH; i++) {
            const sprite = new Sprite();
            sprite.anchor.set(0.5);
            sprite.x = CELL_SIZE / 2;
            this.addChild(sprite);
            this.sprites.push(sprite);
        }
        this.layout();
    }

    /** Поставить ленту ровно на символы видимых рядов (сверху вниз), без анимации. */
    setSymbols(ids: readonly SymbolId[]): void {
        this.offset = 0;
        // При offset = 0 спрайт i стоит в слоте i: спрайт 0 — над окном, 1..ROW_COUNT — ряды,
        // последний — под окном. Скрытые получают случайные символы.
        this.setSymbol(this.sprites[0]!, randomSymbol());
        ids.forEach((id, row) => this.setSymbol(this.sprites[row + 1]!, id));
        this.setSymbol(this.sprites[STRIP_LENGTH - 1]!, randomSymbol());
        this.layout();
    }

    private setSymbol(sprite: Sprite, id: SymbolId): void {
        // Подмена текстуры — дешёвая операция: объект остаётся в дереве (аналог spriteFrame у cc.Sprite).
        sprite.texture = this.textures.get(id);
        // setSize после смены текстуры: размер задаётся через scale относительно размера текстуры.
        sprite.setSize(SYMBOL_SIZE);
    }

    private layout(): void {
        this.sprites.forEach((sprite, i) => {
            const slot = (i + this.offset) % STRIP_LENGTH;
            sprite.y = (slot - 1) * CELL_SIZE + CELL_SIZE / 2;
        });
    }
}
