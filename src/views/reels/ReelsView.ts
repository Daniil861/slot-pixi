import { Container, Graphics, Sprite } from 'pixi.js';
import { REEL_COUNT } from '../../config/game';
import { CELL_SIZE, FRAME_BORDER, REELS_HEIGHT, REELS_WIDTH } from '../../config/layout';
import type { ReelsTiming } from '../../config/reels';
import type { SymbolHighlightStyle } from '../../config/wins';
import type { Grid } from '../../server/RgsClient';
import { Reel } from './Reel';
import type { SymbolTextures } from './SymbolTextures';

/**
 * Зона барабанов 5×3. Слои снизу вверх (порядок addChild = порядок отрисовки):
 *   подложка (reels_bg) → слой символов с маской → рамка (reels_frame).
 * Маска висит только на слое символов: она обрезает ленты по окну, а рамку
 * (выступает за окно на FRAME_BORDER) не трогает.
 *
 * Локальные координаты: (0, 0) — левый верхний угол окна барабанов, окно 1000×600.
 */
export class ReelsView extends Container {
    private readonly reels: Reel[] = [];
    private readonly symbolsLayer = new Container();
    /** Время с начала вращения — по ticker, а не по setTimeout: на неактивной вкладке ticker стоит вместе с анимацией. */
    private spinTime = 0;
    /** Запрошенная остановка: ждёт, пока пройдёт minSpinSec. */
    private pendingStop: { grid: Grid; resolve: () => void } | undefined;
    /** Quick stop нажат до того, как пришёл результат: остановимся сразу, как только он придёт. */
    private quickStopRequested = false;

    constructor(
        textures: SymbolTextures,
        private timing: ReelsTiming,
        highlightStyle: SymbolHighlightStyle,
    ) {
        super();

        // Sprite.from(alias) берёт уже загруженную текстуру из кэша Assets (бандл 'game').
        this.addChild(Sprite.from('reels_bg'));
        this.addChild(this.symbolsLayer);

        // Маска — обычный Graphics: видно только то, что попадает в его залитую область.
        // Цвет заливки не важен: сам Graphics не рисуется и не влияет на bounds
        // (StencilMask ставит ему includeInBuild = false и measurable = false).
        // Его нужно добавить в дерево: так он получает трансформацию и двигается/масштабируется вместе с полем.
        const mask = new Graphics().rect(0, 0, REELS_WIDTH, REELS_HEIGHT).fill(0xffffff);
        this.addChild(mask);
        this.symbolsLayer.mask = mask;

        const frame = Sprite.from('reels_frame');
        frame.position.set(-FRAME_BORDER);
        this.addChild(frame);

        for (let i = 0; i < REEL_COUNT; i++) {
            const reel = new Reel(textures, timing, highlightStyle);
            reel.x = i * CELL_SIZE;
            this.symbolsLayer.addChild(reel);
            this.reels.push(reel);
        }
    }

    /** Показать сетку из ответа сервера без анимации: grid[reel][row]. */
    setGrid(grid: Grid): void {
        grid.forEach((column, i) => this.reels[i]!.setSymbols(column));
    }

    /**
     * Подсветить выигрышные позиции [reel, row]; остальные символы затемняются.
     * Пустой список — снять подсветку.
     */
    highlight(positions: readonly (readonly [reel: number, row: number])[]): void {
        if (positions.length === 0) {
            this.clearHighlight();
            return;
        }
        this.reels.forEach((reel, i) => {
            reel.highlight(positions.filter(([r]) => r === i).map(([, row]) => row));
        });
    }

    clearHighlight(): void {
        this.reels.forEach((reel) => reel.clearHighlight());
    }

    /** Сменить тайминги (turbo). Вращение и остановка, которые уже идут, доигрываются со старыми. */
    setTiming(timing: ReelsTiming): void {
        this.timing = timing;
        this.reels.forEach((reel) => reel.setTiming(timing));
    }

    startSpin(): void {
        this.spinTime = 0;
        this.quickStopRequested = false;
        this.reels.forEach((reel) => reel.startSpin());
    }

    /**
     * Quick stop по повторному нажатию. Если результата ещё нет — запоминаем и не ждём minSpinSec.
     * Если барабаны уже получили результат — каждый останавливается сразу (см. Reel.quickStop).
     */
    quickStop(): void {
        this.quickStopRequested = true;
        this.reels.forEach((reel) => reel.quickStop());
    }

    /**
     * Остановить барабаны на сетке. Промис завершится, когда барабаны встанут —
     * контроллер ждёт его через await и только потом показывает выигрыш.
     */
    stopOn(grid: Grid): Promise<void> {
        return new Promise((resolve) => {
            this.pendingStop = { grid, resolve };
        });
    }

    update(deltaMS: number): void {
        this.spinTime += deltaMS / 1000;
        this.reels.forEach((reel) => reel.update(deltaMS));

        const canStop = this.spinTime >= this.timing.minSpinSec || this.quickStopRequested;
        if (this.pendingStop && canStop) {
            const { grid, resolve } = this.pendingStop;
            this.pendingStop = undefined;
            // Каждый следующий барабан начинает тормозить на reelStopDelaySec позже.
            // Promise.all — промис stopOn завершится, когда встанет последний (правый) барабан.
            const stops = grid.map((column, i) => this.reels[i]!.stopOn(column, i * this.timing.reelStopDelaySec));
            void Promise.all(stops).then(() => resolve());
            // Quick stop был нажат раньше результата — все барабаны встают сразу, без очереди.
            if (this.quickStopRequested) {
                this.reels.forEach((reel) => reel.quickStop());
            }
        }
    }
}
