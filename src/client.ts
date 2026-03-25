import { getToken, clearToken, login } from "./auth.js";

async function doFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = process.env.MM_URL;
  if (!url) throw new Error("MM_URL not set");

  const token = await getToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string>),
  };

  const resp = await fetch(`${url}/api/v4${path}`, {
    ...options,
    headers,
  });

  if (resp.status === 401) {
    clearToken();
    const newToken = await login();
    headers.Authorization = `Bearer ${newToken}`;
    const retry = await fetch(`${url}/api/v4${path}`, {
      ...options,
      headers,
    });
    if (!retry.ok) {
      const body = await retry.text();
      throw new Error(`API error after re-login: ${retry.status} ${body}`);
    }
    return retry;
  }

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`API error: ${resp.status} ${body}`);
  }

  return resp;
}

export async function mmFetch(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const resp = await doFetch(path, { ...options, headers });
  const text = await resp.text();
  if (!text) return null;
  return JSON.parse(text);
}

/** Fetch raw binary data (for file downloads) */
export async function mmFetchRaw(
  path: string
): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
  const resp = await doFetch(path);
  const buf = Buffer.from(await resp.arrayBuffer());
  const contentType = resp.headers.get("Content-Type") || "application/octet-stream";
  const cd = resp.headers.get("Content-Disposition") || "";
  const filenameMatch = cd.match(/filename="?([^";\n]+)"?/);
  const filename = filenameMatch ? filenameMatch[1] : "download";
  return { buffer: buf, contentType, filename };
}

/** Format a single post as human-readable text with file links */
export async function formatPost(post: any): Promise<string> {
  const username = await getUserDisplayName(post.user_id);
  const time = new Date(post.create_at).toLocaleString();
  const threadTag = post.root_id ? " (in thread)" : "";
  const replyCount = post.reply_count ? ` [${post.reply_count} replies]` : "";
  let line = `[${time}] @${username}${threadTag}${replyCount}: ${post.message}`;
  line += `\n  Post ID: ${post.id}`;
  if (post.root_id) {
    line += ` | Thread root: ${post.root_id}`;
  }
  if (post.file_ids && post.file_ids.length > 0) {
    for (const fid of post.file_ids) {
      try {
        const info = await mmFetch(`/files/${fid}/info`);
        const sizeKb = (info.size / 1024).toFixed(1);
        line += `\n  📎 ${info.name} (${sizeKb} KB) file_id: ${fid}`;
      } catch {
        line += `\n  📎 file_id: ${fid}`;
      }
    }
  }
  return line;
}

// Cached user ID
let myUserId: string | null = null;

export async function getMyUserId(): Promise<string> {
  if (myUserId) return myUserId;
  const me = await mmFetch("/users/me");
  myUserId = me.id;
  return me.id;
}

// Cached team ID (first team)
let myTeamId: string | null = null;

export async function getMyTeamId(): Promise<string> {
  if (myTeamId) return myTeamId;
  const teams = await mmFetch("/users/me/teams");
  if (!teams || teams.length === 0) throw new Error("No teams found");
  myTeamId = teams[0].id;
  return teams[0].id;
}

// User display name cache
const userCache = new Map<string, string>();

export async function getUserDisplayName(userId: string): Promise<string> {
  if (userCache.has(userId)) return userCache.get(userId)!;
  try {
    const user = await mmFetch(`/users/${userId}`);
    const name = user.username || user.nickname || userId;
    userCache.set(userId, name);
    return name;
  } catch {
    return userId;
  }
}
