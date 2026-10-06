import * as FileSystem from 'expo-file-system';

// Scan history kept on the phone (survives restarts), newest first.
const FILE = `${FileSystem.documentDirectory}scan-log.json`;
const MAX = 100;

export async function loadScanLog() {
  try { return JSON.parse(await FileSystem.readAsStringAsync(FILE)); } catch { return []; }
}

const save = (log) => FileSystem.writeAsStringAsync(FILE, JSON.stringify(log)).catch(() => {});

const entryOf = (o) => ({
  id: o.id, code: o.code, customer: o.customer, city: o.city, total: o.total,
  status: o.status, pay: o.pay, at: new Date().toISOString(),
});

/** Adds (or moves to the top) an accepted scan. */
export function addToScanLog(log, order) {
  const next = [entryOf(order), ...log.filter((e) => e.id !== order.id)].slice(0, MAX);
  save(next);
  return next;
}

/** Keeps a logged entry in step after paying / delivering from the scan modal. */
export function updateScanLog(log, order) {
  if (!log.some((e) => e.id === order.id)) return log;
  const next = log.map((e) => (e.id === order.id ? { ...e, status: order.status, pay: order.pay, total: order.total } : e));
  save(next);
  return next;
}

export function clearScanLog() {
  save([]);
  return [];
}
