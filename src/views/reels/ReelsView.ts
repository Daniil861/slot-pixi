import { Container, Graphics, Sprite } from 'pixi.js';
import { CELL_SIZE, REEL_COUNT, ROW_COUNT, SYMBOL_SIZE } from '../../config/gameConfig';
import type { Grid } from '../../server/MockRgs';
import type { SymbolTextures } from './SymbolTextures';

export const REELS_WIDTH = CELL_SIZE * REEL_COUNT;   // 1000
export const REELS_HEIGHT = CELL_SIZE * ROW_COUNT;   // 600

/**
 * Статичное поле 5×3. Иерархия: ReelsView → 5 барабанов (Container) → 3 Sprite.
 * Барабан — отдельный Container, потому что в сессии 2 он будет двигаться целиком
 * (точнее, двигать свою ленту), а символы внутри позиционируются относительно него.
 *
 * Локальные координаты: (0, 0) — левый верхний угол поля, поле 1000×600.
 */
export class ReelsView extends Container {
    /** symbols[reel][row] — спрайты создаются один раз, при смене результата меняется только texture. */
    private readonly symbols: Sprite[][] = [];

    constructor(private readonly textures: SymbolTextures) {
        super();

        this.addChild(createPlaceholderBackground());

        for (let reel = 0; reel < REEL_COUNT; reel++) {
            const reelContainer = new Container();
            reelContainer.x = reel * CELL_SIZE;
            this.addChild(reelContainer);

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

/** Временная подложка до арта художника (reels_bg.png): тёмная панель и разделители барабанов. */
function createPlaceholderBackground(): Graphics {
    const g = new Graphics()
        .roundRect(0, 0, REELS_WIDTH, REELS_HEIGHT, 16)
        .fill({ color: 0x2a0a0a, alpha: 0.8 })
        .stroke({ width: 6, color: 0xf5d27a });

    for (let i = 1; i < REEL_COUNT; i++) {
        g.moveTo(i * CELL_SIZE, 8).lineTo(i * CELL_SIZE, REELS_HEIGHT - 8);
    }
    return g.stroke({ width: 2, color: 0xf5d27a, alpha: 0.4 });
}
