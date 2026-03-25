#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerChannelTools } from "./tools/channels.js";
import { registerMessageTools } from "./tools/messages.js";
import { registerUserTools } from "./tools/users.js";
import { registerDirectTools } from "./tools/direct.js";
import { registerMiscTools } from "./tools/misc.js";

const server = new McpServer({
  name: "mattermost",
  version: "1.0.0",
});

registerChannelTools(server);
registerMessageTools(server);
registerUserTools(server);
registerDirectTools(server);
registerMiscTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
