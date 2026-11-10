import { gsap } from 'gsap';
import type { WinsTiming } from '../../config/wins';
import type { LineWin } from '../../server/RgsClient';
import type { ReelsView } from '../reels/ReelsView';
import type { WinLinesView } from './WinLinesView';

/**
 * Показ выигрыша на поле: линии + подсветка символов. Правил игры не знает — всё берёт из LineWin.
 *
 * Два режима, как в большинстве слотов:
 * - showAll — сразу все выигрышные линии и символы (пока крутится счётчик WIN);
 * - startCycle — в idle линии показываются по одной по кругу, пока игрок не запустит новый спин.
 */
export class WinPresenter {
    private cycleCall: gsap.core.Tween | undefined;

    constructor(
        private readonly reels: ReelsView,
        private readonly lines: WinLinesView,
        private timing: WinsTiming,
    ) {}

    /** Сменить тайминги (turbo). Идущая прорисовка доигрывается со старыми, перебор подхватит новые на следующей линии. */
    setTiming(timing: WinsTiming): void {
        this.timing = timing;
    }

    showAll(wins: readonly LineWin[]): void {
        this.stopCycle();
        this.lines.show(wins.map((w) => w.lineIndex), this.timing.lineDrawSec);
        this.reels.highlight(wins.flatMap((w) => w.positions));
    }

    /** Перебор линий по одной. Одна линия — перебирать нечего, остаётся showAll. */
    startCycle(wins: readonly LineWin[]): void {
        this.stopCycle();
        if (wins.length < 2) return;
        const step = (i: number) => {
            const win = wins[i]!;
            this.lines.show([win.lineIndex], this.timing.lineDrawSec);
            this.reels.highlight(win.positions);
            // delayedCall идёт по часам GSAP (= app.ticker): на неактивной вкладке перебор стоит.
            this.cycleCall = gsap.delayedCall(this.timing.cycleLineSec, () => step((i + 1) % wins.length));
        };
        step(0);
    }

    clear(): void {
        this.stopCycle();
        this.lines.hide();
        this.reels.clearHighlight();
    }

    destroy(): void {
        this.stopCycle();
    }

    private stopCycle(): void {
        this.cycleCall?.kill();
        this.cycleCall = undefined;
    }
}
