export const DEFAULT_CENTER = { lat: 41.3851, lng: 2.1734 };

export const parseLatLng = (text: string): { lat: number; lng: number } | null => {
  const m = text
    .trim()
    .match(/^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[3]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
};

export const geocodeAddress = async (address: string) => {
  return new Promise<{ lat: number; lng: number } | null>((resolve) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results[0]?.geometry?.location) {
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng() });
      } else {
        resolve(null);
      }
    });
  });
};

export const applyPlaceToState = (
  place: google.maps.places.PlaceResult,
  setter: (p: { lat: number; lng: number }) => void,
  setText: (t: string) => void,
  setCenter?: (p: { lat: number; lng: number }) => void,
  mapRef?: React.RefObject<google.maps.Map | null>,
) => {
  const loc = place.geometry?.location;
  if (!loc) return;
  const coords = { lat: loc.lat(), lng: loc.lng() };
  setter(coords);
  setText(place.formatted_address || place.name || `${coords.lat}, ${coords.lng}`);
  setCenter?.(coords);
  if (mapRef?.current) {
    mapRef.current.panTo(coords);
    mapRef.current.setZoom(14);
  }
};

export const ensureCoords = async (
  current: { lat: number; lng: number } | null,
  text: string,
  setter: (p: { lat: number; lng: number }) => void,
  label: 'Origin' | 'Destination',
  toast?: (opts: { title: string; description: string; status: 'warning' }) => void,
): Promise<{ lat: number; lng: number } | null> => {
  if (current) return current;
  if (!text.trim()) return null;
  const parsed = parseLatLng(text);
  if (parsed) {
    setter(parsed);
    return parsed;
  }
  const geo = await geocodeAddress(text);
  if (geo) {
    setter(geo);
    return geo;
  }
  toast?.({
    title: `${label} not found`,
    description: 'Try a more precise address.',
    status: 'warning',
  });
  return null;
};
