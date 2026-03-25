import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { mmFetch, mmFetchRaw } from "../client.js";

export function registerMiscTools(server: McpServer) {
  server.tool(
    "add_reaction",
    "Add an emoji reaction to a message",
    {
      post_id: z.string().describe("Post ID to react to"),
      emoji_name: z.string().describe("Emoji name (e.g. 'thumbsup', 'heart')"),
    },
    async ({ post_id, emoji_name }) => {
      const userId = (await mmFetch("/users/me")).id;
      await mmFetch("/reactions", {
        method: "POST",
        body: JSON.stringify({
          user_id: userId,
          post_id,
          emoji_name,
        }),
      });
      return {
        content: [
          {
            type: "text" as const,
            text: `Reaction :${emoji_name}: added to post ${post_id}`,
          },
        ],
      };
    }
  );

  server.tool(
    "get_file_info",
    "Get information about an attached file",
    {
      file_id: z.string().describe("File ID"),
    },
    async ({ file_id }) => {
      const file = await mmFetch(`/files/${file_id}/info`);
      return {
        content: [
          {
            type: "text" as const,
            text: [
              `**${file.name}**`,
              `ID: ${file.id}`,
              `Size: ${(file.size / 1024).toFixed(1)} KB`,
              `Type: ${file.mime_type}`,
              `Extension: ${file.extension}`,
              `Created: ${new Date(file.create_at).toISOString()}`,
            ].join("\n"),
          },
        ],
      };
    }
  );

  server.tool(
    "download_file",
    "Download a file attachment from Mattermost and save it locally",
    {
      file_id: z.string().describe("File ID to download"),
      save_path: z.string().optional().describe("Local path to save the file (default: /tmp/mm-files/<filename>)"),
    },
    async ({ file_id, save_path }) => {
      // Get file info first for the filename
      const info = await mmFetch(`/files/${file_id}/info`);
      const { buffer } = await mmFetchRaw(`/files/${file_id}`);

      const targetDir = save_path ? dirname(save_path) : "/tmp/mm-files";
      const targetPath = save_path || join("/tmp/mm-files", info.name);

      await mkdir(targetDir, { recursive: true });
      await writeFile(targetPath, buffer);

      const sizeKb = (buffer.length / 1024).toFixed(1);
      return {
        content: [
          {
            type: "text" as const,
            text: [
              `File downloaded successfully:`,
              `  Name: ${info.name}`,
              `  Type: ${info.mime_type}`,
              `  Size: ${sizeKb} KB`,
              `  Saved to: ${targetPath}`,
            ].join("\n"),
          },
        ],
      };
    }
  );

  server.tool(
    "list_teams",
    "List teams I belong to",
    {},
    async () => {
      const teams = await mmFetch("/users/me/teams");
      const lines = teams.map(
        (t: any) =>
          `- **${t.display_name}** (~${t.name}) [ID: ${t.id}] — ${t.description || "no description"}`
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `My teams:\n\n${lines.join("\n")}`,
          },
        ],
      };
    }
  );

  server.tool(
    "get_team_info",
    "Get information about a team",
    {
      team_id: z.string().describe("Team ID"),
    },
    async ({ team_id }) => {
      const team = await mmFetch(`/teams/${team_id}`);
      return {
        content: [
          {
            type: "text" as const,
            text: [
              `**${team.display_name}** (~${team.name})`,
              `ID: ${team.id}`,
              `Description: ${team.description || "(none)"}`,
              `Type: ${team.type === "O" ? "open" : "invite-only"}`,
              `Members: ${team.total_member_count || "unknown"}`,
              `Created: ${new Date(team.create_at).toISOString()}`,
            ].join("\n"),
          },
        ],
      };
    }
  );
}
