import { Container } from 'pixi.js';
import { REEL_COUNT, ROW_COUNT, type SymbolId } from '../../config/game';
import { CELL_SIZE, SYMBOL_SIZE } from '../../config/layout';
import type { SymbolSpineConfig } from '../../config/spine';
import { SymbolSpine } from '../spine/SymbolSpine';

export interface WinCell {
    reel: number;
    row: number;
    id: SymbolId;
}

/**
 * Spine-анимации выигрышных символов поверх барабанов. На время показа спрайт в ячейке скрыт (Reel.highlight),
 * вместо него здесь играет SymbolSpine с тем же символом.
 *
 * Пул: по SymbolSpine на ячейку, создаются один раз в конструкторе — как спрайты ленты барабана.
 * Показ — смена скина и visible, без new/destroy (SkeletonData у всех общая, см. Spine.from).
 *
 * Слой без маски и выше рамки: удар (scale 1.25) может выходить за ячейку и рамку.
 * Локальные координаты — как у ReelsView: (0, 0) — левый верхний угол окна барабанов.
 */
export class WinSymbolsView extends Container {
    /** Событие impact любого из показанных символов (для звука). Символы бьют одновременно — может прийти несколько раз за кадр. */
    onImpact: (() => void) | undefined;

    /** cells[reel * ROW_COUNT + row]. */
    private readonly cells: SymbolSpine[] = [];

    constructor(config: SymbolSpineConfig) {
        super();
        // Слой — только картинка: не участвует в hit-test (иначе Pixi спрашивал бы bounds у каждого Spine).
        this.eventMode = 'none';

        for (let reel = 0; reel < REEL_COUNT; reel++) {
            for (let row = 0; row < ROW_COUNT; row++) {
                const spine = new SymbolSpine(config, SYMBOL_SIZE);
                spine.position.set(reel * CELL_SIZE + CELL_SIZE / 2, row * CELL_SIZE + CELL_SIZE / 2);
                spine.visible = false;
                spine.onImpact = () => this.onImpact?.();
                this.addChild(spine);
                this.cells.push(spine);
            }
        }
    }

    /** Показать win на этих ячейках; остальные скрыть. Повторный вызов перезапускает анимацию. */
    show(cells: readonly WinCell[]): void {
        this.hide();
        for (const { reel, row, id } of cells) {
            const spine = this.cells[reel * ROW_COUNT + row]!;
            spine.setSymbol(id);
            spine.visible = true;
            void spine.playWin();
        }
    }

    hide(): void {
        this.cells.forEach((spine) => (spine.visible = false));
    }

    /** Каждый кадр, в секундах. Обновляем только видимые: скрытым анимация не нужна, show её перезапустит. */
    update(deltaSec: number): void {
        for (const spine of this.cells) {
            if (spine.visible) spine.update(deltaSec);
        }
    }
}
