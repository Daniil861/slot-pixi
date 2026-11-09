import { gsap } from 'gsap';
import { Container, Sprite, type DestroyOptions } from 'pixi.js';
import { ROW_COUNT, randomSymbolId, type SymbolId } from '../../config/game';
import { CELL_SIZE, SYMBOL_SIZE } from '../../config/layout';
import type { ReelsTiming } from '../../config/reels';
import type { SymbolTextures } from './SymbolTextures';

/**
 * Спрайтов на ленте: по одному скрытому над и под окном + видимые ряды.
 * Нижний скрытый нужен для крупных символов, которые выступают за свою ячейку:
 * его верхняя часть может заходить в последний видимый ряд, и там должен быть реальный символ, а не пустота.
 */
const STRIP_LENGTH = ROW_COUNT + 2;

/** Куда садится барабан: целевой offset и символы видимых рядов. */
interface Landing {
    target: number;
    ids: readonly SymbolId[];
}

/**
 * Один барабан — лента из STRIP_LENGTH спрайтов, которые ходят по кругу.
 *
 * Состояние ленты — одно число `offset` (в ячейках). Положение каждого спрайта вычисляется из него:
 *   слот = (индекс + offset) mod STRIP_LENGTH; y = (слот − 1) · CELL_SIZE + CELL_SIZE / 2.
 * Слот 0 — над окном, слоты 1..ROW_COUNT — видимые ряды сверху вниз, последний слот — под окном.
 * Целый offset — символы стоят ровно в ячейках; дробный — лента между ними.
 *
 * Вращение — рост offset в update. Остановка — твин offset до целого target (GSAP),
 * спрайты при последнем завороте получают символы результата.
 *
 * Локальные координаты: (0, 0) — левый верхний угол ячейки первого ряда, ширина CELL_SIZE.
 */
export class Reel extends Container {
    private readonly sprites: Sprite[] = [];
    /** Не `position`: это имя уже занято у Container (координаты объекта). */
    private offset = 0;
    private spinning = false;
    private landing: Landing | undefined;

    constructor(
        private readonly textures: SymbolTextures,
        private timing: ReelsTiming,
    ) {
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
        // При offset = 0 спрайт i стоит в слоте i.
        this.sprites.forEach((sprite, i) => this.setSymbol(sprite, symbolForSlot(i, ids)));
        this.layout();
    }

    /** Новые тайминги применяются со следующего действия (старта, остановки) — без рывков посреди анимации. */
    setTiming(timing: ReelsTiming): void {
        this.timing = timing;
    }

    startSpin(): void {
        this.spinning = true;
    }

    /**
     * Остановиться на символах видимых рядов. До старта торможения (delay) барабан продолжает крутиться —
     * так получается поочерёдная остановка слева направо.
     * Промис завершается, когда барабан встал (после bounce).
     */
    stopOn(ids: readonly SymbolId[], delaySec = 0): Promise<void> {
        return new Promise((resolve) => {
            // delayedCall тоже идёт по часам GSAP, а они привязаны к ticker Pixi (см. Engine).
            gsap.delayedCall(delaySec, () => this.land(ids, resolve));
        });
    }

    /**
     * Каждый кадр. deltaMS — реальное время кадра в мс, поэтому скорость не зависит от FPS:
     * на 60 и на 120 Гц барабан проходит одинаковое расстояние за секунду.
     * Ticker ограничивает deltaMS сверху 100 мс (minFPS = 10): после лага лента не «прыгнет» на полэкрана.
     */
    update(deltaMS: number): void {
        if (!this.spinning) return;
        // % STRIP_LENGTH держит число маленьким; на раскладку это не влияет — она и так по модулю.
        this.offset = (this.offset + (this.timing.spinSpeed * deltaMS) / 1000) % STRIP_LENGTH;
        this.layout(true);
    }

    /** Твины держат ссылку на объект: без kill они доиграют и будут трогать уничтоженные спрайты. */
    override destroy(options?: DestroyOptions): void {
        gsap.killTweensOf(this);
        super.destroy(options);
    }

    private land(ids: readonly SymbolId[], onLanded: () => void): void {
        this.spinning = false;
        const { spinSpeed, bounceCells, bounceBackSec } = this.timing;
        // Ближайшая целая позиция + запас. Целое число = символы ровно в ячейках.
        // Запас не меньше длины ленты: тогда каждый спрайт за торможение хотя бы раз заворачивает наверх
        // и успевает получить символ результата (защита от слишком маленького stopCells в конфиге).
        const stopCells = Math.max(this.timing.stopCells, STRIP_LENGTH);
        const target = Math.ceil(this.offset) + stopCells;
        this.landing = { target, ids };

        const overshoot = target + bounceCells;
        // power1.out (1 − (1 − t)²) стартует со скоростью 2 · distance / duration. Подбираем duration так,
        // чтобы стартовая скорость равнялась скорости вращения: торможение начинается без рывка.
        const duration = (2 * (overshoot - this.offset)) / spinSpeed;

        gsap.timeline({
            onUpdate: () => this.layout(true),
            onComplete: () => {
                // Нормализуем: та же раскладка, но маленькое число.
                this.offset = target % STRIP_LENGTH;
                this.landing = undefined;
                this.layout();
                onLanded();
            },
        })
            // Торможение с проездом за цель...
            .to(this, { offset: overshoot, duration, ease: 'power1.out' })
            // ...и возврат назад — bounce.
            .to(this, { offset: target, duration: bounceBackSec, ease: 'power1.inOut' });
    }

    private setSymbol(sprite: Sprite, id: SymbolId): void {
        // Подмена текстуры — дешёвая операция: объект остаётся в дереве (аналог spriteFrame у cc.Sprite).
        sprite.texture = this.textures.get(id);
        // setSize после смены текстуры: размер задаётся через scale относительно размера текстуры.
        sprite.setSize(SYMBOL_SIZE);
    }

    /** @param refreshWrapped — выдать символ спрайтам, которые перескочили снизу наверх. */
    private layout(refreshWrapped = false): void {
        this.sprites.forEach((sprite, i) => {
            const previousY = sprite.y;
            const slot = (i + this.offset) % STRIP_LENGTH;
            sprite.y = (slot - 1) * CELL_SIZE + CELL_SIZE / 2;

            // Заворот снизу наверх — скачок y вверх почти на всю ленту. Небольшое уменьшение y
            // (возврат при bounce) заворотом не считается.
            const wrapped = previousY - sprite.y > (STRIP_LENGTH * CELL_SIZE) / 2;
            if (refreshWrapped && wrapped) {
                // Спрайт сейчас скрыт маской над окном — меняем символ незаметно.
                this.setSymbol(sprite, this.nextSymbolFor(i));
            }
        });
    }

    /**
     * Символ для спрайта, который только что завернул наверх. Если до цели осталось меньше одного
     * круга ленты, это его последний заворот: он сядет в слот (i + target) mod STRIP_LENGTH,
     * значит получает символ результата для этого слота. Иначе — случайный «шум».
     */
    private nextSymbolFor(spriteIndex: number): SymbolId {
        const landing = this.landing;
        if (!landing || landing.target - this.offset >= STRIP_LENGTH) {
            return randomSymbolId();
        }
        return symbolForSlot((spriteIndex + landing.target) % STRIP_LENGTH, landing.ids);
    }
}

/** Видимые слоты 1..ROW_COUNT — символы результата, скрытые крайние — случайные. */
function symbolForSlot(slot: number, ids: readonly SymbolId[]): SymbolId {
    return ids[slot - 1] ?? randomSymbolId();
}
