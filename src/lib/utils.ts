'use client'

let SCREEN_DPI: number|null = null
/**
 * Get the dots per inch of the screen
 * @returns 
 */
export function getScreenDPI() {
  if (SCREEN_DPI) return SCREEN_DPI;
  if(typeof document == "undefined") return 96; // assume 96 if no document (SSR)
  const div = document.createElement("div");
  div.style.width = "1in";
  div.style.height = "1in";
  div.style.position = "absolute";
  div.style.top = "-150%"; // hide the element
  div.style.left = "-150%";
  document.body.appendChild(div);
  SCREEN_DPI = div.offsetWidth; // width in en px
  document.body.removeChild(div);
  return SCREEN_DPI;
}

/**
 * Convert mm to px
 * @param mm 
 * @returns 
 */
export function mmToPx(mm: number) {
  const dpi = getScreenDPI();
  return (mm / 25.4) * dpi;
}

export function downloadFromUrl(dataUrl: string, destinationFileName: string) {
  const a = document.createElement('a');
 
  a.setAttribute('download', destinationFileName);
  a.setAttribute('href', dataUrl);
  a.click();
}