import * as FileSystem from 'expo-file-system';

/** Base64 of a picked document (web: see fileBase64.web.js). */
export const fileBase64 = (asset) => FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
