/* eslint-env browser */
// Web (iPhone home-screen app): the browser's local storage for this site.
const ls = () => { try { return window.localStorage; } catch { return null; } };

export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = undefined;
export async function getItemAsync(key) { return ls()?.getItem(key) ?? null; }
export async function setItemAsync(key, value) { ls()?.setItem(key, value); }
export async function deleteItemAsync(key) { ls()?.removeItem(key); }
