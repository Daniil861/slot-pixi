import { Assets, Container, Graphics, Text, Texture, type Renderer } from 'pixi.js';
import { SYMBOL_IDS, type SymbolId } from '../../config/game';

const PLACEHOLDER_SIZE = 256;

/**
 * Текстуры символов по id. Если кадра нет в атласе (символ добавили в конфиг раньше арта),
 * генерируем заглушку: рисуем Graphics + Text и «запекаем» их в текстуру через renderer.
 * Так остальной код всегда работает с Texture и не знает, настоящая она или нет.
 */
export class SymbolTextures {
    private readonly textures = new Map<SymbolId, Texture>();

    constructor(renderer: Renderer) {
        for (const id of SYMBOL_IDS) {
            // Assets.cache — общий кэш загруженного. Spritesheet кладёт туда каждый кадр по имени.
            if (Assets.cache.has(id)) {
                this.textures.set(id, Texture.from(id));
            } else {
                console.warn(`[SymbolTextures] no frame "${id}" in atlas, using placeholder`);
                this.textures.set(id, createPlaceholder(renderer, id));
            }
        }
    }

    get(id: SymbolId): Texture {
        return this.textures.get(id)!;
    }
}

function createPlaceholder(renderer: Renderer, id: SymbolId): Texture {
    const view = new Container();
    view.addChild(
        new Graphics()
            .roundRect(8, 8, PLACEHOLDER_SIZE - 16, PLACEHOLDER_SIZE - 16, 32)
            .fill(0x5a1a1a)
            .stroke({ width: 8, color: 0xf5d27a }),
    );
    const label = new Text({
        text: id.toUpperCase(),
        style: { fontFamily: 'Arial', fontSize: 48, fontWeight: 'bold', fill: 0xf5d27a },
    });
    label.anchor.set(0.5);
    label.position.set(PLACEHOLDER_SIZE / 2);
    view.addChild(label);

    // generateTexture рендерит объект в RenderTexture один раз. Дальше это обычная текстура,
    // которую можно отдать любому числу спрайтов. Исходные объекты больше не нужны.
    const texture = renderer.generateTexture(view);
    view.destroy({ children: true });
    return texture;
}
