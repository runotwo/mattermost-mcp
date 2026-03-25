# Mattermost MCP Server

MCP (Model Context Protocol) server for Mattermost. Gives Claude and other AI agents access to channels, messages, users, DMs, files, and reactions.

## Quick Start

Add to your MCP config (e.g. `.mcp.json`):

```json
{
  "mcpServers": {
    "mattermost": {
      "command": "npx",
      "args": ["-y", "@anthropic/mattermost-mcp"],
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

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MM_URL` | Yes | Mattermost instance URL |
| `MM_USERNAME` | Yes | Login username |
| `MM_PASSWORD` | Yes | Login password |
| `MM_TOTP_SECRET` | Yes | Base32-encoded TOTP secret for 2FA |

## Available Tools

### Channels
- `list_channels` — List public channels
- `list_my_channels` — List channels you're a member of
- `get_channel_info` — Get channel details by ID or name
- `get_channel_history` — Recent messages from a channel
- `post_message` — Post a message to a channel
- `reply_to_message` — Reply in a thread

### Messages
- `search_messages` — Full-text search across channels
- `get_thread` — Get all messages in a thread

### Users
- `list_users` — List users with pagination
- `get_user_info` — Lookup user by ID, username, or email
- `get_user_status` — Check online/offline status

### Direct Messages
- `list_direct_channels` — List DM and group channels
- `get_direct_messages` — Read DM history
- `send_direct_message` — Send a DM

### Misc
- `add_reaction` — Add emoji reaction
- `get_file_info` — File metadata
- `download_file` — Download attachments
- `list_teams` — List teams
- `get_team_info` — Team details
