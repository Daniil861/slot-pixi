import { Container, Graphics, Sprite } from 'pixi.js';
import { CELL_SIZE, REEL_COUNT, ROW_COUNT } from '../../config/gameConfig';
import type { Grid } from '../../server/RgsClient';
import { Reel } from './Reel';
import type { SymbolTextures } from './SymbolTextures';

export const REELS_WIDTH = CELL_SIZE * REEL_COUNT;   // 1000
export const REELS_HEIGHT = CELL_SIZE * ROW_COUNT;   // 600
/** Ширина рамки вокруг окна барабанов: frame.png 1160×760, окно 1000×600 (docs/ART_BRIEF.md). */
const FRAME_BORDER = 80;

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

    constructor(textures: SymbolTextures) {
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
            const reel = new Reel(textures);
            reel.x = i * CELL_SIZE;
            this.symbolsLayer.addChild(reel);
            this.reels.push(reel);
        }
    }

    /** Показать сетку из ответа сервера без анимации: grid[reel][row]. */
    setGrid(grid: Grid): void {
        grid.forEach((column, i) => this.reels[i]!.setSymbols(column));
    }
}
