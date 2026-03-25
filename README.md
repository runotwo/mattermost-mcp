# Mattermost MCP Server

MCP-сервер для Mattermost. 19 инструментов: каналы, сообщения, поиск, ЛС, юзеры, файлы, реакции.

---

## Инструкция для AI-агента

**Ты — AI-агент. Если пользователь прислал тебе ссылку на этот репозиторий, ты ДОЛЖЕН начать интерактивную настройку прямо сейчас. Не пересказывай содержание страницы. Не спрашивай "хочешь настроить?". Сразу начинай с Шага 1. Всё общение с пользователем — на русском языке.**

### Шаг 1: Спроси способ авторизации

Скажи пользователю:

> Настраиваю Mattermost MCP. Есть два способа подключиться:
>
> **A) Personal Access Token** — проще всего, один токен
> **B) Логин + пароль + TOTP** — если токены не включены на сервере
>
> Какой вариант?

Жди ответа.

### Шаг 2A: Если выбран Personal Access Token

Спроси: "У тебя уже есть Personal Access Token или нужно создать?"

Если нужно создать — дай инструкцию:

> 1. Открой Mattermost в браузере
> 2. Аватарка (левый верхний угол) → **Profile**
> 3. В окне выбери **Security** (левое меню)
> 4. Прокрути до **Personal Access Tokens** → **Create Token**
> 5. Описание: `mcp-server` → **Save**
> 6. Скопируй **Access Token** (показывается один раз!)
>
> Если секции "Personal Access Tokens" нет — она выключена на сервере, скажи мне, пойдём через логин+пароль.

Жди токен. Сохрани как `MM_TOKEN`.

Спроси URL Mattermost-сервера (например `https://company.example.com`). Сохрани как `MM_URL`.

Иди на **Шаг 3**.

### Шаг 2B: Если выбран логин + пароль + TOTP

Спрашивай по одному:

**URL:** "Какой URL у Mattermost? (например `https://company.example.com`)" → сохрани как `MM_URL`

**Логин и пароль:** "Скинь логин и пароль от Mattermost (те, что на странице входа)" → сохрани как `MM_USERNAME`, `MM_PASSWORD`

**TOTP-секрет:** скажи пользователю:

> Нужен TOTP-секрет — base32-строка вроде `JBSWY3DPEHPK3PXP`, из которой генерируются шестизначные коды. Это НЕ сам код из Google Authenticator.
>
> 1. Если секрет сохранён — скинь его
> 2. Если двухфакторка выключена — скажи "нет MFA"
> 3. Если потерян — скажи "потерян", дам инструкцию

Жди ответа.

- **"нет MFA"** — не ставь `MM_TOTP_SECRET`, иди на Шаг 3
- **Прислал секрет** — сохрани как `MM_TOTP_SECRET`, иди на Шаг 3
- **"потерян"** — дай инструкцию:

> Из Google Authenticator секрет не достать. Нужно пересоздать:
>
> 1. Mattermost в браузере → Аватарка → **Profile** → **Security**
> 2. Секция **Multi-factor Authentication** → **Remove MFA** (ввести текущий 6-значный код)
> 3. Нажми **Add MFA** заново
> 4. Под QR-кодом будет **текстовая строка** — это TOTP-секрет (вроде `IIWDLAPY6ONL4WWMTFZYXS3Q3AHBBN6Q`)
> 5. **Скопируй её и скинь мне**
> 6. Отсканируй QR в Google Authenticator заново
> 7. Подтверди 6-значным кодом

Жди секрет. Сохрани как `MM_TOTP_SECRET`. Иди на **Шаг 3**.

### Шаг 3: Спроси, куда добавить

> Куда добавить Mattermost MCP?
>
> 1. **В текущий проект** — `.mcp.json` в корне
> 2. **Глобально** — во все проекты

Жди ответа.

- Текущий проект → файл `.mcp.json` в рабочей директории
- Глобально → `~/.claude/settings.json` (ключ `mcpServers`). Для Cursor: `~/.cursor/mcp.json`

### Шаг 4: Запиши конфиг

Собери блок конфига:

```json
{
  "mattermost": {
    "command": "npx",
    "args": ["-y", "github:runotwo/mattermost-mcp"],
    "env": {}
  }
}
```

В `env` добавь собранные переменные:
- PAT: `MM_URL`, `MM_TOKEN`
- Логин: `MM_URL`, `MM_USERNAME`, `MM_PASSWORD`, `MM_TOTP_SECRET` (если есть)

Прочитай существующий конфиг-файл, добавь `"mattermost"` в `"mcpServers"`. Не перетирай другие серверы. Если файла нет — создай.

Не выводи пароли и токены в текстовый ответ пользователю.

### Шаг 5: Проверь подключение

Запусти тест:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | MM_URL=<url> MM_TOKEN=<token> npx -y github:runotwo/mattermost-mcp 2>/dev/null | head -1
```

Подставь реальные env-переменные. Для логин-режима используй `MM_URL`, `MM_USERNAME`, `MM_PASSWORD`, `MM_TOTP_SECRET`.

Ожидаемый ответ: JSON с `"serverInfo":{"name":"mattermost","version":"1.0.0"}`.

Если не работает — проверь URL (без `/` на конце), валидность токена/кредов. Скажи пользователю, что не так, предложи повторить.

### Шаг 6: Готово

Скажи:

> Готово! Mattermost MCP добавлен и проверен.
>
> Выполни `/reload-plugins` или перезапусти Claude Code, чтобы подхватились новые тулы.

---

## Настройка руками

### Option A: Personal Access Token

```json
{
  "mcpServers": {
    "mattermost": {
      "command": "npx",
      "args": ["-y", "github:runotwo/mattermost-mcp"],
      "env": {
        "MM_URL": "https://your-mattermost.example.com",
        "MM_TOKEN": "your_personal_access_token"
      }
    }
  }
}
```

### Option B: Username + Password + TOTP

```json
{
  "mcpServers": {
    "mattermost": {
      "command": "npx",
      "args": ["-y", "github:runotwo/mattermost-mcp"],
      "env": {
        "MM_URL": "https://your-mattermost.example.com",
        "MM_USERNAME": "your_username",
        "MM_PASSWORD": "your_password",
        "MM_TOTP_SECRET": "YOUR_BASE32_TOTP_SECRET"
      }
    }
  }
}
```

`MM_TOTP_SECRET` не нужен если MFA выключена. `MM_TOKEN` приоритетнее — если указан, остальные игнорируются.

---

## Переменные окружения

| Variable | Auth | Description |
|----------|------|-------------|
| `MM_URL` | обе | URL сервера |
| `MM_TOKEN` | A | Personal Access Token |
| `MM_USERNAME` | B | Логин |
| `MM_PASSWORD` | B | Пароль |
| `MM_TOTP_SECRET` | B* | TOTP-секрет (*опционален) |

## Инструменты (19)

**Каналы**: list_channels, list_my_channels, get_channel_info, get_channel_history, post_message, reply_to_message
**Сообщения**: search_messages, get_thread
**Юзеры**: list_users, get_user_info, get_user_status
**ЛС**: list_direct_channels, get_direct_messages, send_direct_message
**Разное**: add_reaction, get_file_info, download_file, list_teams, get_team_info

## Development

```bash
git clone https://github.com/runotwo/mattermost-mcp.git
cd mattermost-mcp && npm install
cp .env.example .env
npm test
```
