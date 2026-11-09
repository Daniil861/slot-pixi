import type { Container } from 'pixi.js';

/**
 * Вписать контент с дизайн-размером designWidth×designHeight в область width×height целиком
 * (contain, Math.min): всё видно, по краям могут остаться полосы.
 * Аналог Design Resolution + Fit Width + Fit Height у Canvas в Cocos.
 */
export function fitContain(
    content: Container,
    width: number,
    height: number,
    designWidth: number,
    designHeight: number,
): void {
    const scale = Math.min(width / designWidth, height / designHeight);
    content.scale.set(scale);
    content.position.set((width - designWidth * scale) / 2, (height - designHeight * scale) / 2);
}

/**
 * Закрыть область целиком (cover, Math.max): без полос, лишнее обрезается.
 * Для объектов с anchor 0.5 — ставит их в центр области. Подходит для фона.
 */
export function fitCover(
    content: Container,
    width: number,
    height: number,
    contentWidth: number,
    contentHeight: number,
): void {
    const scale = Math.max(width / contentWidth, height / contentHeight);
    content.scale.set(scale);
    content.position.set(width / 2, height / 2);
}
