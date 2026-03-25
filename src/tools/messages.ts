import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { mmFetch, getMyTeamId, formatPost } from "../client.js";

export function registerMessageTools(server: McpServer) {
  server.tool(
    "search_messages",
    "Search messages by text across channels",
    {
      query: z.string().describe("Search query text"),
      is_or_search: z.boolean().optional().describe("Use OR between terms (default false = AND)"),
      page: z.number().optional().describe("Page number (0-based)"),
      per_page: z.number().optional().describe("Results per page (default 20)"),
    },
    async ({ query, is_or_search, page, per_page }) => {
      const teamId = await getMyTeamId();
      const result = await mmFetch(`/teams/${teamId}/posts/search`, {
        method: "POST",
        body: JSON.stringify({
          terms: query,
          is_or_search: is_or_search ?? false,
          page: page ?? 0,
          per_page: per_page ?? 20,
        }),
      });

      const order: string[] = result.order || [];
      const lines: string[] = [];

      for (const postId of order) {
        const post = result.posts[postId];
        const formatted = await formatPost(post);
        lines.push(`${formatted}\n  Channel: ${post.channel_id}`);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: lines.length > 0
              ? `Search results for "${query}" (${order.length} found):\n\n${lines.join("\n\n")}`
              : `No messages found for "${query}".`,
          },
        ],
      };
    }
  );

  server.tool(
    "get_thread",
    "Get all messages in a thread (replies to a root post)",
    {
      post_id: z.string().describe("Post ID (root post or any reply in the thread)"),
    },
    async ({ post_id }) => {
      const thread = await mmFetch(`/posts/${post_id}/thread`);
      const order: string[] = thread.order || [];
      const lines: string[] = [];

      for (const pid of order) {
        const post = thread.posts[pid];
        lines.push(await formatPost(post));
      }

      return {
        content: [
          {
            type: "text" as const,
            text: lines.length > 0
              ? `Thread (${order.length} messages):\n\n${lines.join("\n\n")}`
              : "Empty thread.",
          },
        ],
      };
    }
  );
}
