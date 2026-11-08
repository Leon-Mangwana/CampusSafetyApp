import { Linking, Platform } from 'react-native';

export const hasCoords = (o) => Number.isFinite(o?.latitude) && Number.isFinite(o?.longitude);

/** Open the device's maps app at a coordinate. No-op for missing coords. */
export const openInMaps = async (lat, lng, label = 'Location') => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const encodedLabel = encodeURIComponent(label);
  const native = Platform.select({
    ios: `maps:0,0?q=${encodedLabel}@${lat},${lng}`,
    android: `geo:0,0?q=${lat},${lng}(${encodedLabel})`,
  });
  const web = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  try {
    const ok = native ? await Linking.canOpenURL(native) : false;
    await Linking.openURL(ok ? native : web);
    return true;
  } catch {
    try {
      await Linking.openURL(web);
      return true;
    } catch {
      return false;
    }
  }
};
