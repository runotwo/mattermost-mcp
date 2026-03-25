# Agent Setup Instructions for Mattermost MCP

> **This file is an instruction set FOR the AI agent, not for the human.**
> The agent should follow these steps interactively when a user asks to set up `mattermost-mcp`.

## What this is

`mattermost-mcp` is an MCP server that gives you (the agent) access to a Mattermost instance — channels, messages, search, DMs, files, users. It installs via `npx github:runotwo/mattermost-mcp` and requires auth credentials passed as env vars.

Your job: walk the user through providing credentials, write the MCP config, test the connection, and confirm it works.

## Rules

- Follow the steps **exactly in order**
- **Ask the user and wait for their answer** before moving to the next step — do not assume or skip
- All communication with the user should be in **Russian**
- Do not expose credentials in your visible output — when writing config files, just do it, don't print passwords back

---

## Step 1: Ask about auth method

Say to the user:

> Есть два способа подключить Mattermost MCP:
>
> **A) Personal Access Token** — проще всего. Один токен, никаких паролей.
> **B) Логин + пароль + TOTP** — если токены не включены на сервере.
>
> Какой вариант?

Wait for the user's response before continuing.

---

## Step 2A: Personal Access Token flow

If the user chose **Option A (PAT)**:

Ask: "У тебя уже есть Personal Access Token, или нужно создать?"

### If they need to create one, give these instructions:

> Как создать Personal Access Token:
>
> 1. Открой Mattermost в браузере
> 2. Нажми на свою аватарку (левый верхний угол) → **Profile**
> 3. В открывшемся окне выбери **Security** (в левом меню)
> 4. Прокрути вниз до секции **Personal Access Tokens**
> 5. Нажми **Create Token**
> 6. Введи описание (например `mcp-server`) → **Save**
> 7. Скопируй **Access Token** — он показывается только один раз!
>
> Если секции "Personal Access Tokens" нет — значит, она выключена на сервере. Скажи мне, и пойдём через логин+пароль.

Wait for the user to provide the token. Store it as `MM_TOKEN`.

Also ask: "Какой URL у вашего Mattermost? (например, `https://yourcompany.example.com`)"

Store it as `MM_URL`.

Now go to **Step 3**.

---

## Step 2B: Username + Password + TOTP flow

If the user chose **Option B (login+password+TOTP)**:

Ask the user for three things, **one at a time**:

### 2B.1: URL

> Какой URL у вашего Mattermost? (например, `https://yourcompany.example.com`)

Store as `MM_URL`.

### 2B.2: Username and Password

> Скинь свой логин и пароль от Mattermost (те же, что на странице входа).

Store as `MM_USERNAME` and `MM_PASSWORD`.

### 2B.3: TOTP Secret

Ask:

> Теперь нужен **TOTP-секрет** — это base32-строка, из которой генерируются шестизначные коды для двухфакторки. Это **НЕ сам шестизначный код**, а строка вроде `JBSWY3DPEHPK3PXP`.
>
> Варианты:
> 1. У тебя он где-то сохранён — просто скинь
> 2. Двухфакторка выключена — тогда скажи "нет MFA", и мы обойдёмся без него
> 3. Секрет потерян (сканировал QR в Google Authenticator и не сохранил) — тогда скажи "потерян", я дам инструкцию как пересоздать

Wait for the user's response.

**If "нет MFA"** — do not set `MM_TOTP_SECRET`. Go to Step 3.

**If they provide the secret** — store as `MM_TOTP_SECRET`. Go to Step 3.

**If "потерян"** — give these instructions:

> Секрет придётся пересоздать. Из Google Authenticator его не достать.
>
> 1. Открой Mattermost в браузере
> 2. Аватарка → **Profile** → **Security**
> 3. В секции **Multi-factor Authentication** нажми **Remove MFA**
>    - Потребуется ввести текущий шестизначный код из Google Authenticator
> 4. Теперь нажми **Add MFA** заново
> 5. Появится QR-код, а **под ним текстовая строка** — это и есть TOTP-секрет
>    - Выглядит как `IIWDLAPY6ONL4WWMTFZYXS3Q3AHBBN6Q`
> 6. **Скопируй и скинь мне эту строку**
> 7. Отсканируй тот же QR-код в Google Authenticator (чтобы он продолжил работать)
> 8. Введи шестизначный код для подтверждения

Wait for the user to provide the secret. Store as `MM_TOTP_SECRET`.

Go to **Step 3**.

---

## Step 3: Ask where to add

Say:

> Куда добавить Mattermost MCP?
>
> 1. **В текущий проект** — файл `.mcp.json` в корне проекта
> 2. **Глобально** — будет работать во всех проектах

Wait for the answer.

- If **current project**: the config file is `.mcp.json` in the current working directory.
- If **global**: the config file is `~/.claude/settings.json` (inside the `"mcpServers"` key). If using Cursor, it's `~/.cursor/mcp.json`.

---

## Step 4: Write the config

Build the MCP server config block:

```json
{
  "command": "npx",
  "args": ["-y", "github:runotwo/mattermost-mcp"]
}
```

Add the `env` field based on collected credentials:

- **PAT mode**: `{ "MM_URL": "...", "MM_TOKEN": "..." }`
- **Login mode**: `{ "MM_URL": "...", "MM_USERNAME": "...", "MM_PASSWORD": "...", "MM_TOTP_SECRET": "..." }` (omit `MM_TOTP_SECRET` if no MFA)

### For project-level `.mcp.json`:

Read the existing `.mcp.json` if it exists. Add or merge the `"mattermost"` key under `"mcpServers"`. If the file doesn't exist, create it:

```json
{
  "mcpServers": {
    "mattermost": {
      "command": "npx",
      "args": ["-y", "github:runotwo/mattermost-mcp"],
      "env": {
        ...collected env vars...
      }
    }
  }
}
```

### For global settings:

Read `~/.claude/settings.json`. Add the `"mattermost"` key inside `"mcpServers"`. Create the structure if it doesn't exist.

**IMPORTANT**: Do not overwrite other existing MCP servers in the config. Merge carefully.

---

## Step 5: Test the connection

Run a test to verify the server starts and can authenticate:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | MM_URL=<url> MM_TOKEN=<token> npx -y github:runotwo/mattermost-mcp 2>/dev/null | head -1
```

(Replace env vars with actual values collected in Step 2.)

**Expected result**: a JSON response containing `"serverInfo":{"name":"mattermost","version":"1.0.0"}`.

If the test fails:
- Check that the URL is correct (no trailing slash)
- Check that the token/credentials are valid
- Tell the user what went wrong and offer to retry

If the test succeeds, go to Step 6.

---

## Step 6: Done

Say:

> Готово! Mattermost MCP добавлен и проверен.
>
> Чтобы он подхватился, выполни команду: `/reload-plugins`
> (или перезапусти Claude Code)
>
> После этого у тебя появятся тулы для работы с Mattermost: поиск сообщений, чтение каналов, ЛС, треды, файлы и реакции.
