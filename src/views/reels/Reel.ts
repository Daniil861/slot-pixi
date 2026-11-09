import { Container, Sprite } from 'pixi.js';
import { CELL_SIZE, ROW_COUNT, SYMBOL_SIZE, randomSymbol, type SymbolId } from '../../config/gameConfig';
import type { SymbolTextures } from './SymbolTextures';

/**
 * Спрайтов на ленте: по одному скрытому над и под окном + видимые ряды.
 * Нижний скрытый нужен для крупных символов, которые выступают за свою ячейку:
 * его верхняя часть может заходить в последний видимый ряд, и там должен быть реальный символ, а не пустота.
 */
const STRIP_LENGTH = ROW_COUNT + 2;

/** Скорость вращения, ячеек в секунду (15 × 200 px = 3000 px/с). */
const SPIN_SPEED = 15;

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
    private spinning = false;

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

    startSpin(): void {
        this.spinning = true;
    }

    /** Остановиться на символах видимых рядов. Пока резко; шаг 3 — замедление и bounce. */
    stopOn(ids: readonly SymbolId[]): void {
        this.spinning = false;
        this.setSymbols(ids);
    }

    /**
     * Каждый кадр. deltaMS — реальное время кадра в мс, поэтому скорость не зависит от FPS:
     * на 60 и на 120 Гц барабан проходит одинаковое расстояние за секунду.
     * Ticker ограничивает deltaMS сверху 100 мс (minFPS = 10): после лага лента не «прыгнет» на полэкрана.
     */
    update(deltaMS: number): void {
        if (!this.spinning) return;
        // % STRIP_LENGTH держит число маленьким; на раскладку это не влияет — она и так по модулю.
        this.offset = (this.offset + (SPIN_SPEED * deltaMS) / 1000) % STRIP_LENGTH;
        this.layout(true);
    }

    private setSymbol(sprite: Sprite, id: SymbolId): void {
        // Подмена текстуры — дешёвая операция: объект остаётся в дереве (аналог spriteFrame у cc.Sprite).
        sprite.texture = this.textures.get(id);
        // setSize после смены текстуры: размер задаётся через scale относительно размера текстуры.
        sprite.setSize(SYMBOL_SIZE);
    }

    /** @param refreshWrapped — дать новый случайный символ спрайтам, которые перескочили снизу наверх. */
    private layout(refreshWrapped = false): void {
        this.sprites.forEach((sprite, i) => {
            const previousY = sprite.y;
            const slot = (i + this.offset) % STRIP_LENGTH;
            sprite.y = (slot - 1) * CELL_SIZE + CELL_SIZE / 2;

            // Лента едет вниз, поэтому y может уменьшиться только при завороте из нижнего слота в верхний.
            // В этот момент спрайт скрыт маской — меняем ему символ, и лента выглядит бесконечной.
            if (refreshWrapped && sprite.y < previousY) {
                this.setSymbol(sprite, randomSymbol());
            }
        });
    }
}
