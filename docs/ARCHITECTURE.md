# Архитектура

Демо-слот 5×3 на PixiJS v8 + TypeScript + Vite.

## Слои

```
src/
  main.ts       точка входа: создаёт Engine, RgsClient, GameModel и показывает экраны
  engine/       инфраструктура, не знает о слоте
  config/       данные игры и манифест ассетов
  server/       контракт с сервером и mock-реализация
  game/         логика клиента, без Pixi
  screens/      экраны: собирают view и связывают их с логикой
  views/        отображение на Pixi, без правил игры
```

| Папка | Содержимое | Может импортировать |
| --- | --- | --- |
| `engine/` | `Engine` (обёртка над `Application`), `Navigation` (смена экранов), `Screen` (интерфейс экрана), `layout` (contain/cover) | `pixi.js` |
| `config/` | `gameConfig` (поле, символы, пэйтейбл, линии, ставки), `manifest` (бандлы ассетов) | — |
| `server/` | `RgsClient` (интерфейс `init`/`spin` + типы ответов), `MockRgs` (генерация сетки, расчёт выигрышей) | `config/` |
| `game/` | `GameModel` (баланс, ставка, состояние, события), `GameController` (сценарий спина) | `server/` (только типы), `eventemitter3` |
| `views/` | `ReelsView` (подложка, символы, рамка), `SymbolTextures` (текстуры символов по id) | `pixi.js`, `config/`, `server/` (только типы) |
| `screens/` | `LoadScreen`, `GameScreen` | всё, кроме `MockRgs` |

**Правило:** `game/` и `server/` не импортируют `pixi.js`. `MockRgs` создаётся только в `main.ts`, остальной код работает с интерфейсом `RgsClient`.

## Потоки данных

```
ввод (pointertap) ─► GameScreen ─► GameController ─► RgsClient.spin()
                                        │
                                        ├─► GameModel ── события ──► UI (баланс, ставка)
                                        └─► GameView (ReelsView): setGrid / анимации
```

- **Ввод → логика:** экран ловит события Pixi и вызывает методы контроллера.
- **Логика → отображение:** контроллер вызывает методы view через интерфейс `GameView`; анимации возвращают `Promise`, сценарий пишется через `await`.
- **Модель → UI:** UI подписывается на события `GameModel` и перерисовывается сам.
- **Сервер — источник правды:** баланс после спина берётся из ответа сервера, клиент его не пересчитывает.

## Экраны

`Navigation.showScreen(bundles, create)`:

1. Отключает ввод на текущем экране.
2. Грузит бандлы нового экрана, прогресс уходит в `onLoad` текущего экрана (бар на `LoadScreen`).
3. `hide` → `destroy` текущего экрана.
4. `create()` → `prepare` → `resize` → подписка `update` на ticker → `show`.

Экран — `Container` с необязательными методами `prepare`, `show`, `hide`, `update`, `resize`, `onLoad`. Бандлы экрана — в его `static bundles`. Зависимости передаются через фабрику `create`, глобальных синглтонов нет.

Подписки на объекты, которые живут дольше экрана (`GameModel`), снимаются в `destroy` экрана.

## Раскладка

- Дизайн-разрешение **1920×1080**, ячейка барабана **200×200**, поле **1000×600**.
- `resize(width, height)` получает размер окна в CSS-пикселях; каждый экран раскладывается сам.
- Фон — `fitCover` на всё окно (края обрезаются), игровой контент — `fitContain` (виден целиком).
- `resolution = devicePixelRatio` (до 2) + `autoDensity` — чёткая картинка на HiDPI.

## Ассеты

- Исходники — `art-src/`. `npm run assets` собирает `public/assets/`:
  - символы → атлас `symbols.{png,json}` (scale 0.5, без trim, кадры названы как `SymbolId`);
  - фон, рамка, подложка, логотип копируются как есть.
- Бандлы (`config/manifest.ts`): `loading` — логотип; `game` — атлас, фон, подложка, рамка.
- Текстуры из `Assets` общие: `destroy` экрана их не уничтожает.

## Состояния игры

Сейчас: `idle → spinning → idle`. Ставка списывается сразу при нажатии, при ошибке сервера возвращается.

Планируется: `Idle → Spinning → Stopping → ShowWins → Idle`, с quick stop.
