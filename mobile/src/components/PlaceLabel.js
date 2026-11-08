import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { COLORS } from '../constants/theme';

// Reverse-geocoded place names, keyed by coarse coords (~11 m). Misses are
// cached with a TTL so a moment offline doesn't hide names until restart.
const MISS_TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 300;
const cache = new Map(); // key -> { label: string|null, expires: number|null }

const keyFor = (lat, lng) => `${lat.toFixed(4)},${lng.toFixed(4)}`;

const remember = (key, label) => {
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(key, { label, expires: label ? null : Date.now() + MISS_TTL_MS });
};

const lookup = (key) => {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (hit.expires && hit.expires < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return hit.label;
};

const describePlace = ([place]) => {
  if (!place) return null;
  const parts = [place.name, place.street, place.district, place.city]
    .filter(Boolean)
    .filter((part, i, all) => all.indexOf(part) === i);
  return parts.slice(0, 2).join(', ') || null;
};

/** Human-readable place for a coordinate; renders nothing if unavailable. */
const PlaceLabel = ({ latitude, longitude, prefix = '📍 ', style, fallback = null }) => {
  const valid = Number.isFinite(latitude) && Number.isFinite(longitude);
  const [place, setPlace] = useState(() => (valid ? lookup(keyFor(latitude, longitude)) ?? null : null));

  useEffect(() => {
    if (!valid) return undefined;
    const key = keyFor(latitude, longitude);
    const cached = lookup(key);
    if (cached !== undefined) {
      setPlace(cached);
      return undefined;
    }
    let cancelled = false;
    Location.reverseGeocodeAsync({ latitude, longitude })
      .then((results) => {
        const label = describePlace(results || []);
        remember(key, label);
        if (!cancelled) setPlace(label);
      })
      .catch(() => {
        remember(key, null);
        if (!cancelled) setPlace(null);
      });
    return () => { cancelled = true; };
  }, [latitude, longitude, valid]);

  if (!place) return fallback;
  return <Text style={[styles.label, style]} numberOfLines={1}>{prefix}{place}</Text>;
};

const styles = StyleSheet.create({
  label: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});

export default PlaceLabel;
