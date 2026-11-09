// Точка входа: только сборка зависимостей и порядок экранов. Логики здесь нет.
import { manifest } from './config/manifest';
import { Engine } from './engine/Engine';
import { GameModel } from './game/GameModel';
import { GameScreen } from './screens/GameScreen';
import { LoadScreen } from './screens/LoadScreen';
import { MockRgs } from './server/MockRgs';
import type { RgsClient } from './server/RgsClient';

const engine = new Engine();
await engine.init({ manifest, basePath: 'assets/', background: '#1b1030' });

// Единственное место, где выбирается реализация сервера. Дальше все знают только RgsClient.
const rgs: RgsClient = new MockRgs();
// Модель живёт всю сессию и переживает смену экранов.
const model = new GameModel();

await engine.navigation.showScreen(LoadScreen.bundles, () => new LoadScreen());
await engine.navigation.showScreen(GameScreen.bundles, () => new GameScreen(engine.renderer, model, rgs));
