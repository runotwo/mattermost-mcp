# Настройка Mattermost MCP

> **Это инструкция ДЛЯ AI-агента, не для человека.**
> Следуй шагам ниже, когда пользователь попросил настроить mattermost-mcp.

## Что это

MCP-сервер для Mattermost (Loop). Ставится через `npx github:runotwo/mattermost-mcp`. Нужны env-переменные для авторизации.

## Правила

- Шаги строго по порядку. Не пропускай, не додумывай.
- На каждом шаге **используй тул `AskUserQuestion`** с вариантами ответа в `options` — пользователь выбирает стрелочками, а не печатает текст.
- Общайся **на русском**.
- Не выводи пароли и токены в текстовый ответ — молча пиши в файл.

## Defaults

- `MM_URL` = `https://blinkmap.loop.ru` — зашит, не спрашивай.

---

## Шаг 1: Способ авторизации

Вызови `AskUserQuestion`:
- question: "Как будешь авторизоваться в Loop?"
- header: "Авторизация"
- options:
  1. label: "Personal Access Token (рекомендуется)", description: "Один токен, никаких паролей. Проще всего."
  2. label: "Логин + пароль + TOTP", description: "Если токены не включены на сервере."

Жди выбора.

---

## Шаг 2A: Personal Access Token

Если выбран PAT:

Вызови `AskUserQuestion`:
- question: "У тебя уже есть Personal Access Token?"
- header: "Токен"
- options:
  1. label: "Да, есть", description: "Скину токен"
  2. label: "Нет, нужно создать", description: "Покажи инструкцию"

**Если нужно создать** — выведи текстом:

```
Как создать Personal Access Token:

1. Открой Loop в браузере (https://blinkmap.loop.ru)
2. Аватарка (левый верхний) → Profile
3. Security (в левом меню)
4. Прокрути до Personal Access Tokens → Create Token
5. Описание: mcp-server → Save
6. Скопируй Access Token — показывается один раз

Если секции Personal Access Tokens нет — она выключена. Выбери "Other" и напиши, пойдём через логин+пароль.
```

Затем скажи: "Скинь токен, когда будет готов."

Жди, пока пришлёт токен. Сохрани как `MM_TOKEN`. Иди на **Шаг 3**.

**Если уже есть** — скажи "Скинь токен." Жди. Сохрани как `MM_TOKEN`. Иди на **Шаг 3**.

---

## Шаг 2B: Логин + пароль + TOTP

Если выбран логин+пароль:

### Логин и пароль

Скажи: "Скинь логин и пароль от Loop (те, что на странице входа)."

Жди. Сохрани как `MM_USERNAME` и `MM_PASSWORD`.

### TOTP-секрет

Вызови `AskUserQuestion`:
- question: "Нужен TOTP-секрет — base32-строка (вроде JBSWY3DPEHPK3PXP), из которой генерируются 6-значные коды. Это НЕ сам код из приложения. Что у тебя с ним?"
- header: "TOTP"
- options:
  1. label: "Есть, сейчас скину", description: "TOTP-секрет сохранён"
  2. label: "Нет MFA", description: "Двухфакторка выключена"
  3. label: "Потерян", description: "Сканировал QR и не сохранил строку"

Жди выбора.

**"Есть"** → скажи "Скинь секрет." Жди. Сохрани как `MM_TOTP_SECRET`. Иди на Шаг 3.

**"Нет MFA"** → не ставь `MM_TOTP_SECRET`. Иди на Шаг 3.

**"Потерян"** → выведи текстом:

```
Из Google Authenticator секрет не достать. Пересоздай:

1. Loop → Аватарка → Profile → Security
2. Multi-factor Authentication → Remove MFA (ввести текущий 6-значный код)
3. Add MFA заново
4. Под QR-кодом будет текстовая строка — это TOTP-секрет
   (выглядит как IIWDLAPY6ONL4WWMTFZYXS3Q3AHBBN6Q)
5. Скопируй и скинь мне
6. Пересканируй QR в Google Authenticator
7. Подтверди 6-значным кодом
```

Скажи: "Скинь секрет, когда будет готов." Жди. Сохрани как `MM_TOTP_SECRET`. Иди на **Шаг 3**.

---

## Шаг 3: Куда добавить

Вызови `AskUserQuestion`:
- question: "Куда добавить Mattermost MCP?"
- header: "Скоуп"
- options:
  1. label: "В текущий проект", description: ".mcp.json в корне проекта"
  2. label: "Глобально", description: "Будет работать во всех проектах"

Жди выбора.

- **Текущий проект** → файл `.mcp.json` в текущей рабочей директории
- **Глобально** → `~/.claude/settings.json` (ключ `mcpServers`). Для Cursor: `~/.cursor/mcp.json`.

---

## Шаг 4: Запиши конфиг

Собери блок:

```json
{
  "mattermost": {
    "command": "npx",
    "args": ["-y", "github:runotwo/mattermost-mcp"],
    "env": {
      "MM_URL": "https://blinkmap.loop.ru"
    }
  }
}
```

Добавь в `env` собранные креды:
- **PAT**: `"MM_TOKEN": "<токен>"`
- **Логин**: `"MM_USERNAME": "<логин>"`, `"MM_PASSWORD": "<пароль>"`, `"MM_TOTP_SECRET": "<секрет>"` (если есть)

Прочитай существующий конфиг. Добавь `"mattermost"` внутрь `"mcpServers"`. **Не перетирай другие серверы.** Если файла нет — создай `{ "mcpServers": { ... } }`.

---

## Шаг 5: Проверь подключение

Запусти:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | MM_URL=https://blinkmap.loop.ru MM_TOKEN=<token> npx -y github:runotwo/mattermost-mcp 2>/dev/null | head -1
```

Для логин-режима подставь `MM_USERNAME`, `MM_PASSWORD`, `MM_TOTP_SECRET` вместо `MM_TOKEN`.

**Ожидание**: JSON с `"serverInfo":{"name":"mattermost","version":"1.0.0"}`.

Если ошибка — скажи что не так, предложи исправить.

---

## Шаг 6: Готово

Скажи:

```
Готово! Mattermost MCP добавлен и проверен.

Выполни /reload-plugins или перезапусти Claude Code.

После этого будут доступны: поиск сообщений, чтение каналов, ЛС, треды, файлы и реакции.
```
