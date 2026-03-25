import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { mmFetch } from "../client.js";

export function registerUserTools(server: McpServer) {
  server.tool(
    "list_users",
    "List users in the system",
    {
      page: z.number().optional().describe("Page number (0-based)"),
      per_page: z.number().optional().describe("Results per page (default 50)"),
    },
    async ({ page, per_page }) => {
      const p = page ?? 0;
      const pp = per_page ?? 50;
      const users = await mmFetch(`/users?page=${p}&per_page=${pp}`);
      const lines = users.map(
        (u: any) =>
          `- **@${u.username}** (${u.first_name} ${u.last_name}) [ID: ${u.id}] — ${u.position || "no position"} — ${u.email || ""}`
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Users (page ${p}):\n\n${lines.join("\n")}`,
          },
        ],
      };
    }
  );

  server.tool(
    "get_user_info",
    "Get user info by ID, username, or email",
    {
      user_id: z.string().optional().describe("User ID"),
      username: z.string().optional().describe("Username (without @)"),
      email: z.string().optional().describe("User email"),
    },
    async ({ user_id, username, email }) => {
      let user: any;
      if (user_id) {
        user = await mmFetch(`/users/${user_id}`);
      } else if (username) {
        user = await mmFetch(`/users/username/${username}`);
      } else if (email) {
        user = await mmFetch(`/users/email/${email}`);
      } else {
        return {
          content: [
            { type: "text" as const, text: "Provide user_id, username, or email" },
          ],
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: [
              `**@${user.username}** (${user.first_name} ${user.last_name})`,
              `ID: ${user.id}`,
              `Email: ${user.email || "(hidden)"}`,
              `Position: ${user.position || "(none)"}`,
              `Locale: ${user.locale}`,
              `Roles: ${user.roles}`,
              `Created: ${new Date(user.create_at).toISOString()}`,
              `Last activity: ${user.last_activity_at ? new Date(user.last_activity_at).toISOString() : "unknown"}`,
            ].join("\n"),
          },
        ],
      };
    }
  );

  server.tool(
    "get_user_status",
    "Get user online/offline status",
    {
      user_id: z.string().describe("User ID"),
    },
    async ({ user_id }) => {
      const status = await mmFetch(`/users/${user_id}/status`);
      return {
        content: [
          {
            type: "text" as const,
            text: `User ${user_id}: **${status.status}** (last activity: ${status.last_activity_at ? new Date(status.last_activity_at).toISOString() : "unknown"})`,
          },
        ],
      };
    }
  );
}
