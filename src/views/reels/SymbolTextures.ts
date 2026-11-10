import { Assets, Container, Graphics, Text, Texture, type Renderer } from 'pixi.js';
import { SYMBOL_IDS, type SymbolId } from '../../config/game';
import type { SymbolPlaceholderStyle } from '../../config/ui';

/**
 * Текстуры символов по id. Если кадра нет в атласе (символ добавили в конфиг раньше арта),
 * генерируем заглушку: рисуем Graphics + Text и «запекаем» их в текстуру через renderer.
 * Так остальной код всегда работает с Texture и не знает, настоящая она или нет.
 */
export class SymbolTextures {
    private readonly textures = new Map<SymbolId, Texture>();

    constructor(renderer: Renderer, placeholder: SymbolPlaceholderStyle) {
        for (const id of SYMBOL_IDS) {
            // Assets.cache — общий кэш загруженного. Spritesheet кладёт туда каждый кадр по имени.
            if (Assets.cache.has(id)) {
                this.textures.set(id, Texture.from(id));
            } else {
                console.warn(`[SymbolTextures] no frame "${id}" in atlas, using placeholder`);
                this.textures.set(id, createPlaceholder(renderer, id, placeholder));
            }
        }
    }

    get(id: SymbolId): Texture {
        return this.textures.get(id)!;
    }
}

function createPlaceholder(renderer: Renderer, id: SymbolId, style: SymbolPlaceholderStyle): Texture {
    const { size, inset } = style;
    const view = new Container();
    view.addChild(
        new Graphics()
            .roundRect(inset, inset, size - inset * 2, size - inset * 2, style.radius)
            .fill(style.fillColor)
            .stroke({ width: style.strokeWidth, color: style.strokeColor }),
    );
    const label = new Text({
        text: id.toUpperCase(),
        style: { fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: 'bold', fill: style.textColor },
    });
    label.anchor.set(0.5);
    label.position.set(size / 2);
    view.addChild(label);

    // generateTexture рендерит объект в RenderTexture один раз. Дальше это обычная текстура,
    // которую можно отдать любому числу спрайтов. Исходные объекты больше не нужны.
    const texture = renderer.generateTexture(view);
    view.destroy({ children: true });
    return texture;
}
