import { gsap } from 'gsap';
import { Container, Graphics, type DestroyOptions } from 'pixi.js';
import { CELL_SIZE, REELS_WIDTH } from '../../config/layout';
import type { WinLinesStyle } from '../../config/wins';
import type { Payline } from '../../server/RgsClient';

interface Point {
    x: number;
    y: number;
}

/** Ломаная линии, подготовленная для частичной отрисовки. */
interface Polyline {
    points: Point[];
    /** Длина пути от начала до каждой точки: cumulative[0] = 0, последняя = полная длина. */
    cumulative: number[];
    color: number;
}

/**
 * Линии выплат поверх барабанов. Один Graphics на все линии.
 *
 * Появление — «перо» слева направо: reveal.progress твинится 0 → 1, на каждом обновлении — clear()
 * и ломаная до длины progress · L. Скорость пера постоянная по длине пути, конец скруглён (cap: 'round').
 * Перестроить десяток коротких ломаных за кадр дёшево; после окончания твина Graphics не меняется.
 *
 * Локальные координаты — как у ReelsView: (0, 0) — левый верхний угол окна барабанов.
 */
export class WinLinesView extends Container {
    private readonly graphics = new Graphics();
    private paylines: readonly Payline[] = [];
    private shown: Polyline[] = [];
    /** Доля прорисовки 0..1. Объект, а не поле класса: GSAP твинит его свойство. */
    private readonly reveal = { progress: 1 };
    private revealTween: gsap.core.Tween | undefined;

    constructor(private readonly style: WinLinesStyle) {
        super();
        this.addChild(this.graphics);
        // Линии — только картинка: не перехватывают клики и не участвуют в hit-test.
        this.eventMode = 'none';
    }

    setPaylines(paylines: readonly Payline[]): void {
        this.paylines = paylines;
    }

    /**
     * Показать линии с указанными индексами, все одновременно прорисовываются слева направо за drawSec.
     * Длительность — параметр, а не стиль: она из пресета таймингов (turbo), см. WinPresenter.
     */
    show(lineIndices: readonly number[], drawSec: number): void {
        this.revealTween?.kill();
        const { colors } = this.style;
        this.shown = lineIndices.flatMap((index) => {
            const line = this.paylines[index];
            return line ? [toPolyline(line, colors[index % colors.length]!)] : [];
        });

        this.reveal.progress = 0;
        this.redraw();
        this.revealTween = gsap.to(this.reveal, {
            progress: 1,
            duration: drawSec,
            // Быстрый старт и мягкое «дотягивание» к правому краю.
            ease: 'power1.out',
            onUpdate: () => this.redraw(),
        });
    }

    hide(): void {
        this.revealTween?.kill();
        this.revealTween = undefined;
        this.shown = [];
        this.graphics.clear();
    }

    override destroy(options?: DestroyOptions): void {
        this.revealTween?.kill();
        super.destroy(options);
    }

    private redraw(): void {
        const g = this.graphics.clear();
        const { width, shadowExtraWidth, shadowColor, shadowAlpha } = this.style;
        for (const line of this.shown) {
            const length = line.cumulative[line.cumulative.length - 1]! * this.reveal.progress;
            if (length <= 0) continue;
            // В v8 сначала путь, потом stroke/fill. stroke() очищает активный путь, поэтому для второго
            // прохода путь строим заново (повторно путь используется только в связке fill() → stroke()).
            // Тёмная подложка шире основной линии — линия читается поверх любых символов.
            tracePartial(g, line, length);
            g.stroke({ width: width + shadowExtraWidth, color: shadowColor, alpha: shadowAlpha, cap: 'round', join: 'round' });
            tracePartial(g, line, length);
            g.stroke({ width, color: line.color, cap: 'round', join: 'round' });
        }
    }
}

/** Точки линии: от левого края окна через центры ячеек до правого края. */
function toPolyline(line: Payline, color: number): Polyline {
    const centers = line.map((row, reel) => ({
        x: reel * CELL_SIZE + CELL_SIZE / 2,
        y: row * CELL_SIZE + CELL_SIZE / 2,
    }));
    const points = [{ x: 0, y: centers[0]!.y }, ...centers, { x: REELS_WIDTH, y: centers[centers.length - 1]!.y }];

    const cumulative = [0];
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1]!;
        const b = points[i]!;
        cumulative.push(cumulative[i - 1]! + Math.hypot(b.x - a.x, b.y - a.y));
    }
    return { points, cumulative, color };
}

/** Путь по ломаной от начала до длины length: целые отрезки + часть текущего (линейная интерполяция). */
function tracePartial(g: Graphics, { points, cumulative }: Polyline, length: number): void {
    g.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
        const b = points[i]!;
        if (cumulative[i]! <= length) {
            g.lineTo(b.x, b.y);
            continue;
        }
        const a = points[i - 1]!;
        const t = (length - cumulative[i - 1]!) / (cumulative[i]! - cumulative[i - 1]!);
        g.lineTo(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
        break;
    }
}
