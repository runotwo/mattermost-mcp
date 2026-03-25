import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { mmFetch, getMyUserId, getUserDisplayName, formatPost } from "../client.js";

export function registerDirectTools(server: McpServer) {
  server.tool(
    "list_direct_channels",
    "List my direct message channels",
    {},
    async () => {
      const userId = await getMyUserId();
      const channels = await mmFetch(`/users/${userId}/channels`);
      const dms = channels.filter(
        (ch: any) => ch.type === "D" || ch.type === "G"
      );

      const lines: string[] = [];
      for (const ch of dms) {
        if (ch.type === "D") {
          // Extract the other user's ID from the channel name (format: userid1__userid2)
          const parts = ch.name.split("__");
          const otherId = parts[0] === userId ? parts[1] : parts[0];
          const otherName = await getUserDisplayName(otherId);
          lines.push(
            `- DM with **@${otherName}** [ID: ${ch.id}] (${ch.total_msg_count} msgs)`
          );
        } else {
          lines.push(
            `- Group: **${ch.display_name || ch.name}** [ID: ${ch.id}] (${ch.total_msg_count} msgs)`
          );
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Direct message channels (${dms.length}):\n\n${lines.join("\n")}`,
          },
        ],
      };
    }
  );

  server.tool(
    "get_direct_messages",
    "Get message history from a direct message channel",
    {
      channel_id: z.string().optional().describe("DM channel ID (if known)"),
      user_id: z.string().optional().describe("Other user's ID (creates/finds DM channel)"),
      page: z.number().optional().describe("Page number (0-based)"),
      per_page: z.number().optional().describe("Messages per page (default 20)"),
    },
    async ({ channel_id, user_id, page, per_page }) => {
      let chId = channel_id;
      if (!chId && user_id) {
        const myId = await getMyUserId();
        const ch = await mmFetch("/channels/direct", {
          method: "POST",
          body: JSON.stringify([myId, user_id]),
        });
        chId = ch.id;
      }
      if (!chId) {
        return {
          content: [
            { type: "text" as const, text: "Provide channel_id or user_id" },
          ],
        };
      }

      const pp = per_page ?? 20;
      const p = page ?? 0;
      const posts = await mmFetch(
        `/channels/${chId}/posts?page=${p}&per_page=${pp}`
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
              ? `Direct messages (page ${p}):\n\n${lines.join("\n")}`
              : "No messages found.",
          },
        ],
      };
    }
  );

  server.tool(
    "send_direct_message",
    "Send a direct message to a user",
    {
      user_id: z.string().describe("Recipient user ID"),
      message: z.string().describe("Message text"),
    },
    async ({ user_id, message }) => {
      const myId = await getMyUserId();
      // Create or get existing DM channel
      const ch = await mmFetch("/channels/direct", {
        method: "POST",
        body: JSON.stringify([myId, user_id]),
      });
      const post = await mmFetch("/posts", {
        method: "POST",
        body: JSON.stringify({ channel_id: ch.id, message }),
      });
      const otherName = await getUserDisplayName(user_id);
      return {
        content: [
          {
            type: "text" as const,
            text: `Direct message sent to @${otherName}. Post ID: ${post.id}`,
          },
        ],
      };
    }
  );
}
