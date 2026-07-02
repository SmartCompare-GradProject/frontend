/**
 * Parsed laptop product specs JSON (`LaptopSpecs` on the backend).
 * Value fields use backend snake_case where applicable; prediction flags are camelCase.
 */
export interface Laptop {
  battery: string | null;
  camera: string | null;
  color: string | null;
  colour_gamut: string | null;
  isColourGamutPredicted: boolean | null;
  graphics_card: string | null;
  graphics_card_tgp: string | null;
  isGraphicsCardTgpPredicted: boolean | null;
  keyboard: string | null;
  laptop_ports: unknown[] | null;
  memory: string | null;
  memory_slots: string | null;
  model: string | null;
  operating_system: string | null;
  panel: string | null;
  isPanelPredicted: boolean | null;
  ports: string | null;
  power_adapter: string | null;
  processor: string | null;
  refresh_rate: string | null;
  resolution: string | null;
  screen_size: string | null;
  source: string | null;
  speaker: string | null;
  storage: string | null;
  storage_slot: string | null;
  touchscreen: unknown | null;
  isTouchscreenPredicted: boolean | null;
  weight: string | null;
}
