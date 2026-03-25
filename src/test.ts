import { login } from "./auth.js";
import { mmFetch, mmFetchRaw, getMyUserId, getMyTeamId, formatPost } from "./client.js";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

// Load .env manually for test script
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx);
    const value = trimmed.substring(eqIdx + 1);
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  console.log("No .env file found, using environment variables");
}

async function test() {
  console.log("=== Mattermost MCP Test Suite ===\n");

  // 1. Login
  console.log("1. Testing login...");
  const token = await login();
  console.log(`   OK — token: ${token.substring(0, 12)}...`);

  // 2. Get my user info
  console.log("\n2. Getting user info...");
  const me = await mmFetch("/users/me");
  console.log(`   OK — @${me.username} (${me.first_name} ${me.last_name}), ID: ${me.id}`);

  // 3. Get teams
  console.log("\n3. Getting teams...");
  const teams = await mmFetch("/users/me/teams");
  for (const t of teams) {
    console.log(`   - ${t.display_name} (~${t.name}) [${t.id}]`);
  }

  const teamId = await getMyTeamId();
  const userId = await getMyUserId();

  // 4. List my channels
  console.log("\n4. Getting my channels...");
  const channels = await mmFetch(`/users/${userId}/teams/${teamId}/channels`);
  const nonDM = channels.filter((ch: any) => ch.type !== "D" && ch.type !== "G");
  console.log(`   Found ${channels.length} total channels (${nonDM.length} non-DM)`);

  // 5. Channel history with formatPost (file links!)
  const backend = nonDM.find((ch: any) => ch.name === "backend") || nonDM[0];
  console.log(`\n5. Last 5 messages from #${backend.name} (with file info)...`);
  const posts = await mmFetch(`/channels/${backend.id}/posts?page=0&per_page=5`);
  const order: string[] = posts.order || [];
  for (const postId of order) {
    const post = posts.posts[postId];
    console.log(await formatPost(post));
    console.log();
  }

  // 6. Find a thread and read it
  console.log("6. Finding a message with replies (thread test)...");
  // Search for messages with replies in backend channel
  let threadRootId: string | null = null;
  const histPosts = await mmFetch(`/channels/${backend.id}/posts?page=0&per_page=30`);
  for (const pid of histPosts.order || []) {
    const p = histPosts.posts[pid];
    if (!p.root_id && p.reply_count && p.reply_count > 0) {
      threadRootId = pid;
      break;
    }
  }
  if (threadRootId) {
    console.log(`   Found thread root: ${threadRootId}`);
    const thread = await mmFetch(`/posts/${threadRootId}/thread`);
    const tOrder: string[] = thread.order || [];
    console.log(`   Thread has ${tOrder.length} messages:`);
    for (const pid of tOrder.slice(0, 5)) {
      const p = thread.posts[pid];
      console.log(await formatPost(p));
      console.log();
    }
    if (tOrder.length > 5) console.log(`   ... and ${tOrder.length - 5} more`);
  } else {
    console.log("   No threads found in recent messages, skipping");
  }

  // 7. DM channels
  console.log("7. Direct message channels...");
  const allCh = await mmFetch(`/users/${userId}/channels`);
  const dms = allCh.filter((ch: any) => ch.type === "D");
  console.log(`   Found ${dms.length} DM channels`);
  // Find a DM with messages and read it
  const dmWithMsgs = dms.find((ch: any) => ch.total_msg_count > 0);
  if (dmWithMsgs) {
    console.log(`   Reading DM channel ${dmWithMsgs.id}...`);
    const dmPosts = await mmFetch(`/channels/${dmWithMsgs.id}/posts?page=0&per_page=3`);
    for (const pid of (dmPosts.order || []).slice(0, 3)) {
      const p = dmPosts.posts[pid];
      console.log(await formatPost(p));
      console.log();
    }
  }

  // 8. Search messages
  console.log("8. Searching messages for 'привет'...");
  const result = await mmFetch(`/teams/${teamId}/posts/search`, {
    method: "POST",
    body: JSON.stringify({ terms: "привет", is_or_search: false }),
  });
  const searchOrder: string[] = result.order || [];
  console.log(`   Found ${searchOrder.length} results`);

  // 9. File download test — find a message with files
  console.log("\n9. File download test...");
  let fileId: string | null = null;
  // Search recent posts for one with files
  const recentPosts = await mmFetch(`/channels/${backend.id}/posts?page=0&per_page=50`);
  for (const pid of recentPosts.order || []) {
    const p = recentPosts.posts[pid];
    if (p.file_ids && p.file_ids.length > 0) {
      fileId = p.file_ids[0];
      break;
    }
  }
  if (fileId) {
    console.log(`   Found file: ${fileId}`);
    const info = await mmFetch(`/files/${fileId}/info`);
    console.log(`   File info: ${info.name} (${info.mime_type}, ${(info.size / 1024).toFixed(1)} KB)`);
    const { buffer, filename } = await mmFetchRaw(`/files/${fileId}`);
    const savePath = join("/tmp/mm-files", filename);
    await mkdir("/tmp/mm-files", { recursive: true });
    await writeFile(savePath, buffer);
    console.log(`   Downloaded ${buffer.length} bytes → ${savePath}`);
  } else {
    console.log("   No files found in recent #backend messages, skipping");
  }

  console.log("\n=== All tests passed! ===");
}

test().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
