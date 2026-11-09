// Точка входа: только сборка зависимостей и порядок экранов. Логики здесь нет.
import { manifest } from './config/manifest';
import { Engine } from './engine/Engine';
import { GameScreen } from './screens/GameScreen';
import { LoadScreen } from './screens/LoadScreen';
import { MockRgs } from './server/MockRgs';

const engine = new Engine();
await engine.init({ manifest, basePath: 'assets/', background: '#1b1030' });

// Конкретная реализация сервера создаётся только здесь. Шаг 3: экраны будут получать интерфейс RgsClient.
const rgs = new MockRgs();

await engine.navigation.showScreen(LoadScreen.bundles, () => new LoadScreen());
await engine.navigation.showScreen(GameScreen.bundles, () => new GameScreen(engine.renderer, rgs));
