import type { AppConfig, ServiceAreaConfig } from "./appConfig";
import type { SelectedLocation } from "./location";
import type { LngLat } from "./routing";

const KM_PER_DEGREE = 111;

const areaOf = (config: AppConfig | ServiceAreaConfig) => ("serviceArea" in config ? config.serviceArea : config);

function kmBetween([lngA, latA]: LngLat, [lngB, latB]: LngLat): number {
  const lngScale = Math.cos((((latA + latB) / 2) * Math.PI) / 180);
  return Math.hypot((lngA - lngB) * lngScale, latA - latB) * KM_PER_DEGREE;
}

function insidePolygon([x, y]: LngLat, polygon: LngLat[]): boolean {
  return polygon.reduce((inside, [xA, yA], index) => {
    const [xB, yB] = polygon[(index + polygon.length - 1) % polygon.length];
    const crossesRay = yA > y !== yB > y && x < xA + ((xB - xA) * (y - yA)) / (yB - yA);
    return crossesRay ? !inside : inside;
  }, false);
}

function matchesAny(patterns: string[], text: string): boolean {
  return patterns.some(pattern => {
    try {
      return new RegExp(pattern, "i").test(text);
    } catch {
      return false;
    }
  });
}

function covers(area: ServiceAreaConfig, coordinates: LngLat): boolean {
  if (area.circle) return kmBetween(coordinates, area.circle.center) <= area.circle.radiusKm;
  return area.polygons.some(polygon => insidePolygon(coordinates, polygon));
}

export function isWithinServiceArea(location: SelectedLocation, config: AppConfig | ServiceAreaConfig): boolean {
  const area = areaOf(config);
  if (!area.enabled) return true;
  if (matchesAny(area.blockedAddressPatterns, location.address)) return false;
  if (area.circle || area.polygons.length > 0) return covers(area, location.coordinates);
  const hasRequired = area.requiredAddressPatterns.length === 0 || matchesAny(area.requiredAddressPatterns, location.address);
  return hasRequired && matchesAny(area.allowedAddressPatterns, location.address);
}

export function isWithinServiceAreaCoordinates(coordinates: LngLat, config: AppConfig | ServiceAreaConfig): boolean {
  const area = areaOf(config);
  return !area.enabled || covers(area, coordinates);
}
