import { Assets, Container, type Ticker } from 'pixi.js';
import type { Screen } from './Screen';

/**
 * Менеджер экранов — аналог director.loadScene() в Cocos.
 * Упрощённая версия Navigation из официального шаблона PixiJS (create-pixi.js, creation-web):
 * без попапов и пула экранов.
 */
export class Navigation {
    /** Все экраны живут в этом контейнере, он добавлен в stage. */
    readonly container = new Container();

    private current: Screen | undefined;
    private width = 0;
    private height = 0;

    constructor(private readonly ticker: Ticker) {}

    /**
     * Загрузить бандлы нового экрана, убрать текущий, создать и показать новый.
     *
     * Экран создаётся фабрикой ПОСЛЕ загрузки бандлов: конструктор экрана может сразу брать
     * текстуры из кэша. Фабрика (а не класс) — чтобы передавать экрану зависимости через конструктор.
     */
    async showScreen(bundles: readonly string[], create: () => Screen): Promise<void> {
        const previous = this.current;
        if (previous) {
            previous.interactiveChildren = false;
        }

        if (bundles.length > 0) {
            // Прогресс отдаём текущему экрану: обычно это экран загрузки, который рисует бар.
            await Assets.loadBundle([...bundles], (progress) => previous?.onLoad?.(progress));
        }
        previous?.onLoad?.(1);

        if (previous) {
            await this.remove(previous);
        }

        const screen = create();
        this.current = screen;
        this.container.addChild(screen);
        screen.prepare?.();
        screen.resize?.(this.width, this.height);
        if (screen.update) {
            // Второй аргумент — контекст this для колбэка, иначе внутри update потеряется this.
            this.ticker.add(screen.update, screen);
        }
        if (screen.show) {
            screen.interactiveChildren = false;
            await screen.show();
            screen.interactiveChildren = true;
        }
    }

    resize(width: number, height: number): void {
        this.width = width;
        this.height = height;
        this.current?.resize?.(width, height);
    }

    private async remove(screen: Screen): Promise<void> {
        screen.interactiveChildren = false;
        await screen.hide?.();
        if (screen.update) {
            this.ticker.remove(screen.update, screen);
        }
        this.container.removeChild(screen);
        // children: true — уничтожить всё дерево экрана. Текстуры из Assets НЕ уничтожаются
        // (texture: false по умолчанию): атлас общий, его используют и другие экраны.
        screen.destroy({ children: true });
    }
}
