import * as FileSystem from 'expo-file-system';

// Small JSON documents in the app's files (web: see jsonFile.web.js).
export async function readJson(name) {
  try { return JSON.parse(await FileSystem.readAsStringAsync(`${FileSystem.documentDirectory}${name}`)); } catch { return null; }
}

export function writeJson(name, value) {
  return FileSystem.writeAsStringAsync(`${FileSystem.documentDirectory}${name}`, JSON.stringify(value)).catch(() => {});
}
