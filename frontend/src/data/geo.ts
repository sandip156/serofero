// data/geo.ts

/* Basic types */
export type LatLng = [number, number];

/**
 * Map centers for some of your existing TREKS (by id).
 * Add more ids from your TREKS array as you collect coordinates.
 */
export const TREK_CENTERS: Record<number, LatLng> = {
  // --- Near Kathmandu / Valley ---
  301: [27.811, 85.402], // Shivapuri Peak Trail
  302: [27.57,  85.39 ], // Phulchowki Hill Walk (approx)
  303: [27.627, 85.284], // Champadevi–Hattiban Ridge
  304: [27.83,  85.22 ], // Kakani Viewpoint Spur (approx)
  308: [27.715, 85.520], // Nagarkot Sunrise Loop

  // --- Pokhara / Annapurna side ---
  306: [28.229, 83.948], // Phewa Lakeshore–World Peace Pagoda
  309: [28.240, 83.958], // Sarangkot Hill Spur
  305: [28.183, 84.107], // Begnas Lakeside Spur (approx)
  206: [28.372, 83.699], // Khopra + Poon Hill (approx)
  110: [28.402, 83.706], // Khopra Danda Ridge (approx)
  108: [28.400, 83.700], // Ghorepani Poon Hill (approx)
  106: [28.464, 83.901], // Mardi Himal (approx)
  102: [28.530, 83.885], // Annapurna Base Camp (approx)

  // --- Khumbu / Everest area ---
  101: [28.004, 86.858], // Everest Base Camp (approx)
  103: [27.955, 86.695], // Gokyo Lakes & Gokyo Ri (approx)

  // --- Langtang / Helambu / Rasuwa ---
  105: [28.210, 85.575], // Langtang Valley (approx)
  112: [28.200, 85.450], // Tamang Heritage & Langtang (approx)
  109: [27.78,  85.52 ], // Helambu Trek (approx)
  205: [27.821, 85.452], // Sundarijal–Chisapani Ridge

  // --- Manaslu / Mustang (approximate centers) ---
  104: [28.57,  84.58 ], // Manaslu Circuit (approx)
  107: [29.18,  83.96 ], // Upper Mustang / Lo Manthang (approx)
  111: [28.70,  83.97 ], // Annapurna Circuit (Short) (approx)
};

/**
 * Optional trail polylines (if you want to render lines instead of points).
 * Example format shown; keep empty if you don’t have paths yet.
 */
export const TREK_PATHS: Record<number, LatLng[]> = {
  // 101: [ [27.713, 86.732], [27.81, 86.76], [27.89, 86.79], [28.004, 86.858] ], // EBC (toy example)
};

/* ---------------- Non-trek activity spots (so rafting/paragliding/canyoning pages work) ---------------- */

export type ExtraSpot = {
  id: number;
  name: string;
  activity: string;      // e.g. 'Rafting' | 'Paragliding' | 'Canyoning'
  location: string;
  rating: number;
  image: string;
  center: LatLng;
  path?: LatLng[];       // optional: draw a short section of river/trail
};

export const EXTRA_SPOTS: ExtraSpot[] = [
  {
    id: 9001,
    name: 'Trishuli River',
    activity: 'Rafting',
    location: 'Nuwakot/Dhading',
    rating: 4.6,
    image: '/image/rafting.jpeg',
    center: [27.95, 85.15],
  },
  {
    id: 9002,
    name: 'Bhote Koshi',
    activity: 'Rafting',
    location: 'Sindhupalchok',
    rating: 4.7,
    image: '/image/rafting.jpeg',
    center: [27.91, 85.84],
  },
  {
    id: 9003,
    name: 'Sarangkot',
    activity: 'Paragliding',
    location: 'Pokhara',
    rating: 4.8,
    image: '/image/paragliding.jpeg',
    center: [28.240, 83.958],
  },
  {
    id: 9004,
    name: 'Jalbire Canyon',
    activity: 'Canyoning',
    location: 'Chitwan/Sindhuli border',
    rating: 4.6,
    image: '/image/can.jpeg',
    center: [27.692, 85.785],
  },
];
