const STORAGE_KEY = 'biomassa.deviceConfig';

export function getDeviceConfig() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

export function saveDeviceConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearDeviceConfig() {
  localStorage.removeItem(STORAGE_KEY);
}
