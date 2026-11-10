/**
 * What each service includes, as the app's Scope guide shows it to customers and workers
 * (frontend/components/VehicleScopeSheet.tsx). Doyo answers "what does it cover" from this, so
 * the two must say the same thing.
 */
export const SERVICE_SCOPE = {
  home: {
    Regular: ["Room floors: brooming and mopping"],
    Deep: [
      "Floors: brooming and mopping",
      "Glass surfaces: glass cleaning",
      "Windows: window cleaning",
      "Tables, desks and flat surfaces: dusting and wiping",
      "Corners, edges, switches and handles: dusting",
    ],
  },
  vehicle: {
    Exterior: [
      "Roof and top: wash and wipe",
      "Windows: exterior glass wipe",
      "Left and right sides: wash and wipe",
      "Bottom and undercarriage: low-dust rinse only",
      "Wheels: wash and rinse",
    ],
    Interior: [
      "Dashboard and steering wheel: dust and wipe, no water",
      "Front and back seats: dust and wipe",
      "Floor and carpets: vacuum or sweep",
      "Inside windows and mirrors: wipe",
    ],
  },
  furniture: {
    Moving: [
      "Big items: beds, sofas, wardrobes, dining tables",
      "Small items: chairs, side tables, TVs, boxes",
      "Between rooms and floors: shifted where you want it",
    ],
    "Not included": ["Packing and unpacking", "Assembling or dismantling", "Cleaning (book Home Services separately)"],
  },
  barber: {
    Services: ["Haircut: cut and styled the way you ask", "Beard: trimmed and styled"],
    "Not included": ["Facials and skin care"],
    "Barber brings": ["Clippers and trimmer", "Scissors and combs", "Razor", "Shaving cape", "Sanitized tools"],
  },
};
