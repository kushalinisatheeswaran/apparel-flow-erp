/**
 * Central mapping of component names to local static PNG images.
 * Maps exact seed component names and common variants to images in /public/.
 */
export const COMPONENT_IMAGE_MAP: Record<string, string> = {
  "Front Body Panel": "/Front Body Panel.png",
  "Back Body Panel": "/Back Body Panel.png",
  "Sleeves": "/Sleeves.png",
  "Sleeves (Left & Right)": "/Sleeves.png",
  "Collar & Stand": "/Collar & Stand.png",
  "Sleeve Cuffs": "/Sleeve Cuffs.png",
  "Front Chest Panel": "/Front Chest Panel.png",
  "Back Support Panel": "/Back Support Panel.png",
  "Neck Binding Strip": "/Neck Binding Strip.png",
  "Hem Elastic Casing": "/Hem Elastic Casing.png",
  "Side Strap Accents": "/Side Strap Accents.png",
};

/**
 * Returns the relative image URL for a given component name,
 * falling back to null if no mapping exists.
 */
export function getComponentImageUrl(componentName: string): string | null {
  if (!componentName) return null;
  // Direct lookup
  if (COMPONENT_IMAGE_MAP[componentName]) {
    return COMPONENT_IMAGE_MAP[componentName];
  }
  // Case-insensitive / normalized lookup fallback
  const normalized = componentName.trim().toLowerCase();
  for (const [key, value] of Object.entries(COMPONENT_IMAGE_MAP)) {
    if (key.toLowerCase() === normalized || normalized.includes(key.toLowerCase()) || key.toLowerCase().includes(normalized)) {
      return value;
    }
  }
  return null;
}
