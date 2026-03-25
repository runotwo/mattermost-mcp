import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { mmFetch, getMyUserId, getMyTeamId, getUserDisplayName, formatPost } from "../client.js";

export function registerChannelTools(server: McpServer) {
  server.tool(
    "list_channels",
    "List public channels in the team",
    {
      team_id: z.string().optional().describe("Team ID (uses default team if omitted)"),
      page: z.number().optional().describe("Page number (0-based)"),
      per_page: z.number().optional().describe("Results per page (default 50)"),
    },
    async ({ team_id, page, per_page }) => {
      const tid = team_id || (await getMyTeamId());
      const p = page ?? 0;
      const pp = per_page ?? 50;
      const channels = await mmFetch(
        `/teams/${tid}/channels?page=${p}&per_page=${pp}`
      );
      const lines = channels.map(
        (ch: any) =>
          `- **${ch.display_name}** (~${ch.name}) [ID: ${ch.id}] — ${ch.header || "no description"} (${ch.total_msg_count} msgs)`
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Public channels (page ${p}):\n\n${lines.join("\n")}`,
          },
        ],
      };
    }
  );

  server.tool(
    "list_my_channels",
    "List channels I am a member of",
    {},
    async () => {
      const userId = await getMyUserId();
      const teamId = await getMyTeamId();
      const channels = await mmFetch(
        `/users/${userId}/teams/${teamId}/channels`
      );
      const lines = channels.map((ch: any) => {
        const typeLabel =
          ch.type === "O"
            ? "public"
            : ch.type === "P"
              ? "private"
              : ch.type === "D"
                ? "DM"
                : ch.type === "G"
                  ? "group"
                  : ch.type;
        return `- **${ch.display_name || "(DM)"}** (~${ch.name}) [${typeLabel}] [ID: ${ch.id}]`;
      });
      return {
        content: [
          {
            type: "text" as const,
            text: `My channels (${channels.length}):\n\n${lines.join("\n")}`,
          },
        ],
      };
    }
  );

  server.tool(
    "get_channel_info",
    "Get information about a channel by ID or name",
    {
      channel_id: z.string().optional().describe("Channel ID"),
      channel_name: z.string().optional().describe("Channel name (e.g. 'general')"),
      team_id: z.string().optional().describe("Team ID (required with channel_name)"),
    },
    async ({ channel_id, channel_name, team_id }) => {
      let ch: any;
      if (channel_id) {
        ch = await mmFetch(`/channels/${channel_id}`);
      } else if (channel_name) {
        const tid = team_id || (await getMyTeamId());
        ch = await mmFetch(`/teams/${tid}/channels/name/${channel_name}`);
      } else {
        return {
          content: [
            { type: "text" as const, text: "Provide either channel_id or channel_name" },
          ],
        };
      }
      const stats = await mmFetch(`/channels/${ch.id}/stats`);
      return {
        content: [
          {
            type: "text" as const,
            text: [
              `**${ch.display_name}** (~${ch.name})`,
              `ID: ${ch.id}`,
              `Type: ${ch.type === "O" ? "public" : ch.type === "P" ? "private" : ch.type}`,
              `Header: ${ch.header || "(none)"}`,
              `Purpose: ${ch.purpose || "(none)"}`,
              `Members: ${stats.member_count}`,
              `Messages: ${stats.message_count}`,
              `Created: ${new Date(ch.create_at).toISOString()}`,
            ].join("\n"),
          },
        ],
      };
    }
  );

  server.tool(
    "get_channel_history",
    "Get recent messages from a channel",
    {
      channel_id: z.string().describe("Channel ID"),
      page: z.number().optional().describe("Page number (0-based)"),
      per_page: z.number().optional().describe("Number of messages (default 20)"),
    },
    async ({ channel_id, page, per_page }) => {
      const pp = per_page ?? 20;
      const p = page ?? 0;
      const posts = await mmFetch(
        `/channels/${channel_id}/posts?page=${p}&per_page=${pp}`
      );
      const order: string[] = posts.order || [];
      const lines: string[] = [];

      for (const postId of order) {
        const post = posts.posts[postId];
        lines.push(await formatPost(post));
      }

      return {
        content: [
          {
            type: "text" as const,
            text: lines.length > 0
              ? `Messages from channel (page ${p}):\n\n${lines.join("\n")}`
              : "No messages found.",
          },
        ],
      };
    }
  );

  server.tool(
    "post_message",
    "Post a message to a channel",
    {
      channel_id: z.string().describe("Channel ID"),
      message: z.string().describe("Message text (supports Markdown)"),
    },
    async ({ channel_id, message }) => {
      const post = await mmFetch("/posts", {
        method: "POST",
        body: JSON.stringify({ channel_id, message }),
      });
      return {
        content: [
          {
            type: "text" as const,
            text: `Message posted successfully to channel. Post ID: ${post.id}`,
          },
        ],
      };
    }
  );

  server.tool(
    "reply_to_message",
    "Reply to a specific message in a thread",
    {
      channel_id: z.string().describe("Channel ID"),
      root_id: z.string().describe("ID of the root message to reply to"),
      message: z.string().describe("Reply message text"),
    },
    async ({ channel_id, root_id, message }) => {
      const post = await mmFetch("/posts", {
        method: "POST",
        body: JSON.stringify({ channel_id, root_id, message }),
      });
      return {
        content: [
          {
            type: "text" as const,
            text: `Reply posted successfully. Post ID: ${post.id}`,
          },
        ],
      };
    }
  );
}
