export interface TableDef {
  id: number;
  seats: number;
  x: number; // position ratio (0-1) of game width
  y: number; // position ratio (0-1) of game height
}

export const TABLES: TableDef[] = [
  { id: 0, seats: 2, x: 0.2, y: 0.35 },
  { id: 1, seats: 2, x: 0.5, y: 0.35 },
  { id: 2, seats: 2, x: 0.8, y: 0.35 },
];
