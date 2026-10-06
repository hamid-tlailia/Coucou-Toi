/* eslint-env browser */
// Web: the browser's local storage for this site.
export async function readJson(name) {
  try { return JSON.parse(window.localStorage.getItem(`file:${name}`)); } catch { return null; }
}

export async function writeJson(name, value) {
  try { window.localStorage.setItem(`file:${name}`, JSON.stringify(value)); } catch { /* full / private mode */ }
}
