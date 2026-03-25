# Mattermost MCP Server

MCP-сервер для Mattermost. 19 инструментов: каналы, сообщения, поиск, ЛС, юзеры, файлы, реакции.

## Установка

Скопируй и вставь в Claude Code / Cursor:

```
Настрой мне Mattermost MCP по этой инструкции: https://raw.githubusercontent.com/runotwo/mattermost-mcp/main/SETUP.md
```

Агент спросит креды, добавит конфиг и проверит, что всё работает.

---

## Ручная настройка

### Option A: Personal Access Token (рекомендуется)

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

`MM_TOTP_SECRET` не нужен если MFA выключена. `MM_TOKEN` приоритетнее.

---

## Как получить креды

### Personal Access Token

1. Mattermost → Аватарка → **Profile** → **Security**
2. **Personal Access Tokens** → **Create Token** → скопировать

### TOTP-секрет (если потерян)

1. **Profile** → **Security** → **Remove MFA** (ввести текущий код)
2. **Add MFA** заново → скопировать строку под QR-кодом
3. Пересканировать QR в Google Authenticator

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
