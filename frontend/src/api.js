/**
 * api.js — All backend communication lives here.
 * No other file may call fetch() against the backend directly.
 *
 * Base URL is read from the VITE_API_URL environment variable.
 * If the variable is not set, it falls back to http://localhost:8000.
 * Set it in frontend/.env:  VITE_API_URL=http://your-server:8000
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    // Surface FastAPI's detail string if present, otherwise generic message
    const detail =
      typeof data?.detail === "string"
        ? data.detail
        : data?.detail?.[0]?.msg ?? `HTTP ${res.status}`;
    throw new Error(detail);
  }

  return data;
}

/**
 * POST /entry
 * Sends free-form text to the backend. The backend parser decides whether
 * to add an entry or retrieve existing ones.
 *
 * @param {string} text  Raw user input, e.g. "new anime Blue Lock"
 * @returns {Promise<{intent: string, message: string, entry?: object, entries?: object[]}>}
 */
export async function addOrRetrieve(text) {
  return request("/entry", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

/**
 * GET /entry?category=<category>
 * Fetch all stored entries that belong to a category.
 *
 * @param {string} category  e.g. "anime"
 * @returns {Promise<object[]>}
 */
export async function getByCategory(category) {
  return request(`/entry?category=${encodeURIComponent(category)}`);
}

/**
 * GET /search?q=<query>
 * Full-text keyword search across content, tags, and category.
 *
 * @param {string} query  e.g. "blue"
 * @returns {Promise<object[]>}
 */
export async function searchEntries(query) {
  return request(`/search?q=${encodeURIComponent(query)}`);
}
