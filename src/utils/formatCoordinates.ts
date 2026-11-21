/** "34.05220° N, 118.24370° W" */
export function formatCoordinates(latitude: number, longitude: number): string {
  const lat = `${Math.abs(latitude).toFixed(5)}° ${latitude >= 0 ? 'N' : 'S'}`;
  const lng = `${Math.abs(longitude).toFixed(5)}° ${
    longitude >= 0 ? 'E' : 'W'
  }`;
  return `${lat}, ${lng}`;
}
