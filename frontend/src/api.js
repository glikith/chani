/**
 * api.js — All backend communication for Chani lives here.
 * No other file may call fetch() against the backend directly.
 *
 * Base URL: VITE_API_URL env var, fallback to http://localhost:8000
 * Set in frontend/.env:  VITE_API_URL=http://your-server:8000
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    const detail =
      typeof data?.detail === "string"
        ? data.detail
        : data?.detail?.[0]?.msg ?? `HTTP ${res.status}`;
    throw new Error(detail);
  }
  return data;
}

/**
 * POST /entry  — natural-language input
 * @param {string} text  e.g. "new anime Blue Lock"
 */
export async function addOrRetrieve(text) {
  return request("/entry", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

/**
 * POST /entry  — structured add (used by undo-delete restore flow)
 * Builds a synthetic NL string so the backend parser stores it cleanly.
 * @param {string} category
 * @param {string} content
 * @param {string[]} tags   (ignored by this call — parser rebuilds them)
 */
export async function addEntry(category, content, _tags) {
  return request("/entry", {
    method: "POST",
    body: JSON.stringify({ text: `add ${category} ${content}` }),
  });
}

/**
 * GET /entry?category=<category>
 * @param {string} category  e.g. "anime"
 */
export async function getByCategory(category) {
  return request(`/entry?category=${encodeURIComponent(category)}`);
}

/**
 * GET /search?q=<query>
 * @param {string} query  e.g. "blue"
 */
export async function searchEntries(query) {
  return request(`/search?q=${encodeURIComponent(query)}`);
}

/**
 * DELETE /entry/{id}
 * @param {number} id
 */
export async function deleteEntry(id) {
  return request(`/entry/${id}`, { method: "DELETE" });
}

/**
 * DELETE /entry/by-content?q=<keyword>
 * Finds and deletes the best content match across all categories.
 * @param {string} keyword
 */
export async function deleteEntryByContent(keyword) {
  return request(`/entry/by-content?q=${encodeURIComponent(keyword)}`, {
    method: "DELETE",
  });
}

/**
 * POST /category
 * Adds a new category to config.json and hot-reloads the parser.
 * @param {string} name  e.g. "scifi"
 */
export async function addCategory(name) {
  return request("/category", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}