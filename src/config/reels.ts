// Тайминги барабанов — «ощущение» игры. Пресеты неизменяемы; какой из них активен,
// решает выбор игрока (GameModel.turbo). Код барабанов получает объект через конструктор/setTiming
// и о режимах не знает. Все времена — в секундах (как в GSAP), суффикс Sec в имени.

export interface ReelsTiming {
    /** Скорость вращения, ячеек в секунду. */
    readonly spinSpeed: number;
    /** Минимальное время вращения: короткий спин при быстром ответе сервера выглядит как сбой. */
    readonly minSpinSec: number;
    /** Задержка между остановками соседних барабанов (слева направо). */
    readonly reelStopDelaySec: number;
    /** Сколько ячеек барабан проезжает при торможении. Не меньше длины ленты (ROW_COUNT + 2), см. Reel. */
    readonly stopCells: number;
    /** Проезд за целевую позицию перед возвратом, в ячейках. */
    readonly bounceCells: number;
    /** Длительность возврата после проезда. */
    readonly bounceBackSec: number;
    /** Длительность торможения при quick stop (повторное нажатие во время вращения). */
    readonly quickStopSec: number;
}

// satisfies: проверка по интерфейсу (опечатка или пропущенное поле — ошибка компиляции),
// при этом тип объекта остаётся точным. Object.freeze — защита от изменения в рантайме.
export const NORMAL_TIMING = Object.freeze({
    spinSpeed: 15,
    minSpinSec: 1,
    reelStopDelaySec: 0.15,
    stopCells: 5,
    bounceCells: 0.25,
    bounceBackSec: 0.18,
    quickStopSec: 0.2,
} satisfies ReelsTiming);

export const TURBO_TIMING = Object.freeze({
    ...NORMAL_TIMING,
    spinSpeed: 20,
    minSpinSec: 0.3,
    reelStopDelaySec: 0.05,
    bounceCells: 0.15,
    bounceBackSec: 0.12,
} satisfies ReelsTiming);
