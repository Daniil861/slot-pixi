import type { Container, Ticker } from 'pixi.js';

/**
 * Экран — аналог сцены в Cocos/Phaser. В Pixi сцен нет, поэтому экран — обычный Container
 * с необязательными методами жизненного цикла. Их вызывает Navigation, сам экран их не вызывает.
 *
 * Порядок: конструктор → prepare → resize → show → (update каждый кадр, resize при изменении окна)
 *          → hide → destroy.
 */
export interface Screen extends Container {
    /** Подготовка перед показом, когда экран уже в дереве (аналог onLoad/start в Cocos). */
    prepare?(): void;
    /** Анимация появления. Пока промис не завершён, ввод на экране отключён. */
    show?(): Promise<void>;
    /** Анимация скрытия перед удалением. */
    hide?(): Promise<void>;
    /** Каждый кадр, пока экран активен (аналог update(dt) компонента в Cocos). */
    update?(ticker: Ticker): void;
    /** Размер окна в CSS-пикселях. Экран сам решает, как раскладываться. */
    resize?(width: number, height: number): void;
    /** Прогресс загрузки бандлов СЛЕДУЮЩЕГО экрана, 0..1. Нужен экрану загрузки. */
    onLoad?(progress: number): void;
}
