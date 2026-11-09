import { Application, Assets, type AssetsManifest } from 'pixi.js';
import { Navigation } from './Navigation';

export interface EngineOptions {
    manifest: AssetsManifest;
    basePath: string;
    background: string;
}

/**
 * Обёртка над Application: инициализация рендера, ассетов и навигации, проброс resize.
 * Ничего не знает о слоте — переносится в другой проект без изменений.
 */
export class Engine {
    readonly app = new Application();
    readonly navigation = new Navigation(this.app.ticker);

    async init(options: EngineOptions): Promise<void> {
        // init асинхронный: Pixi выбирает WebGPU или WebGL и поднимает выбранный renderer.
        await this.app.init({
            resizeTo: window,
            background: options.background,
            antialias: true,
            // Чёткая картинка на HiDPI: буфер canvas в devicePixelRatio раз больше,
            // а autoDensity возвращает CSS-размер canvas к размеру окна.
            resolution: Math.min(window.devicePixelRatio, 2),
            autoDensity: true,
        });
        document.body.appendChild(this.app.canvas);

        // Assets.init — один раз и до любых загрузок.
        await Assets.init({ manifest: options.manifest, basePath: options.basePath });

        this.app.stage.addChild(this.navigation.container);

        // resizeTo: window меняет размер renderer, renderer генерирует 'resize' — передаём экранам.
        // app.screen — в CSS-пикселях (без учёта resolution), раскладка считается в них.
        this.app.renderer.on('resize', (width, height) => this.navigation.resize(width, height));
        this.navigation.resize(this.app.screen.width, this.app.screen.height);
    }

    get renderer() {
        return this.app.renderer;
    }
}
