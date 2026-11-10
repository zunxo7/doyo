/**
 * What each service includes and leaves out. This is the only copy: the app's Scope guide loads it
 * from /api/scope and Doyo's planner reads it, so customers, workers and the agent always agree.
 * The wording is the app's translation keys, so change a line and its Urdu together.
 */
export type ScopeItem = { area: string; method: string; excluded?: boolean };
export type ScopePage = { label: string; items: ScopeItem[] };

export const SERVICE_SCOPE: Record<"home" | "vehicle" | "furniture" | "barber", [ScopePage, ScopePage]> = {
  home: [
    { label: "Regular", items: [{ area: "Room floors", method: "Brooming and mopping" }] },
    {
      label: "Deep",
      items: [
        { area: "Floors", method: "Brooming and mopping" },
        { area: "Glass surfaces", method: "Glass cleaning" },
        { area: "Windows", method: "Window cleaning" },
        { area: "Tables, desks, and flat surfaces", method: "Dusting and wiping" },
        { area: "Corners, edges, switches, and handles", method: "Dusting" },
      ],
    },
  ],
  vehicle: [
    {
      label: "Exterior",
      items: [
        { area: "Roof and top", method: "Wash and wipe" },
        { area: "Windows", method: "Exterior glass wipe" },
        { area: "Left side", method: "Wash and wipe" },
        { area: "Right side", method: "Wash and wipe" },
        { area: "Bottom and undercarriage", method: "Low-dust rinse only" },
        { area: "Wheels", method: "Wash and rinse" },
      ],
    },
    {
      label: "Interior",
      items: [
        { area: "Dashboard and steering wheel", method: "Dust and wipe, no water" },
        { area: "Front seats", method: "Dust and wipe" },
        { area: "Back seats", method: "Dust and wipe" },
        { area: "Floor and carpets", method: "Vacuum or sweep" },
        { area: "Windows (inside)", method: "Interior glass wipe" },
        { area: "Mirrors (inside)", method: "Interior mirror wipe" },
      ],
    },
  ],
  furniture: [
    {
      label: "Moving",
      items: [
        { area: "Big items", method: "Beds, sofas, wardrobes, dining tables" },
        { area: "Small items", method: "Chairs, side tables, TVs, boxes" },
        { area: "Between rooms and floors", method: "Shifted where you want it" },
      ],
    },
    {
      label: "Not included",
      items: [
        { area: "Packing and unpacking", method: "Not included", excluded: true },
        { area: "Assembling or dismantling", method: "Not included", excluded: true },
        { area: "Cleaning", method: "Book Home Services separately", excluded: true },
      ],
    },
  ],
  barber: [
    {
      label: "Services",
      items: [
        { area: "Haircut", method: "Cut and styled the way you ask" },
        { area: "Beard", method: "Trimmed and styled" },
        { area: "Facials and skin care", method: "Not included", excluded: true },
      ],
    },
    {
      label: "Barber brings",
      items: [
        { area: "Clippers and trimmer", method: "Brought by the barber" },
        { area: "Scissors and combs", method: "Brought by the barber" },
        { area: "Razor", method: "Brought by the barber" },
        { area: "Shaving cape", method: "Brought by the barber" },
        { area: "Sanitizing supplies", method: "Tools are sanitized before use" },
      ],
    },
  ],
};
