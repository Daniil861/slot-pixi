import { Container, Sprite } from 'pixi.js';
import { CELL_SIZE, REEL_COUNT, ROW_COUNT, SYMBOL_SIZE } from '../../config/gameConfig';
import type { Grid } from '../../server/RgsClient';
import type { SymbolTextures } from './SymbolTextures';

export const REELS_WIDTH = CELL_SIZE * REEL_COUNT;   // 1000
export const REELS_HEIGHT = CELL_SIZE * ROW_COUNT;   // 600
/** Ширина рамки вокруг окна барабанов: frame.png 1160×760, окно 1000×600 (docs/ART_BRIEF.md). */
const FRAME_BORDER = 80;

/**
 * Зона барабанов 5×3. Слои снизу вверх (порядок addChild = порядок отрисовки):
 *   подложка (reels_bg) → слой символов → рамка (reels_frame).
 * Слой символов: 5 барабанов (Container) → 3 Sprite. Отдельный слой нужен для сессии 2:
 * маска будет обрезать только символы, а подложка и рамка останутся как есть.
 *
 * Локальные координаты: (0, 0) — левый верхний угол окна барабанов, окно 1000×600.
 * Рамка выступает за окно на FRAME_BORDER, поэтому стоит в (-80, -80).
 */
export class ReelsView extends Container {
    /** symbols[reel][row] — спрайты создаются один раз, при смене результата меняется только texture. */
    private readonly symbols: Sprite[][] = [];
    private readonly symbolsLayer = new Container();

    constructor(private readonly textures: SymbolTextures) {
        super();

        // Sprite.from(alias) берёт уже загруженную текстуру из кэша Assets (бандл 'game').
        this.addChild(Sprite.from('reels_bg'));
        this.addChild(this.symbolsLayer);

        const frame = Sprite.from('reels_frame');
        frame.position.set(-FRAME_BORDER);
        this.addChild(frame);

        for (let reel = 0; reel < REEL_COUNT; reel++) {
            const reelContainer = new Container();
            reelContainer.x = reel * CELL_SIZE;
            this.symbolsLayer.addChild(reelContainer);

            const column: Sprite[] = [];
            for (let row = 0; row < ROW_COUNT; row++) {
                const sprite = new Sprite();
                sprite.anchor.set(0.5);
                sprite.position.set(CELL_SIZE / 2, row * CELL_SIZE + CELL_SIZE / 2);
                reelContainer.addChild(sprite);
                column.push(sprite);
            }
            this.symbols.push(column);
        }
    }

    /** Показать сетку из ответа сервера: grid[reel][row]. */
    setGrid(grid: Grid): void {
        grid.forEach((column, reel) => {
            column.forEach((id, row) => {
                const sprite = this.symbols[reel]![row]!;
                // Подмена текстуры — самая дешёвая операция: объект в дереве остаётся тем же.
                // Аналог смены spriteFrame у cc.Sprite.
                sprite.texture = this.textures.get(id);
                // setSize после смены текстуры: размер задаётся через scale относительно размера текстуры.
                sprite.setSize(SYMBOL_SIZE);
            });
        });
    }
}

