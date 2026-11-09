/**
 * Saves the plan on screen as a PNG. The drawing uses the site's colour
 * variables, which a standalone image can't see, so each shape's computed
 * colours are written onto a copy first.
 */

const PAINT = ["fill", "stroke", "fill-opacity", "stroke-opacity", "stroke-width", "font-family", "font-size", "font-weight", "letter-spacing"] as const;

export async function downloadPlanImage(svg: SVGSVGElement, name: string): Promise<void> {
  const { width, height } = svg.getBoundingClientRect();
  const copy = svg.cloneNode(true) as SVGSVGElement;
  const from = svg.querySelectorAll("*");
  const to = copy.querySelectorAll("*");
  from.forEach((el, i) => {
    const cs = getComputedStyle(el);
    const target = to[i] as SVGElement;
    for (const p of PAINT) target.style.setProperty(p, cs.getPropertyValue(p));
  });
  copy.setAttribute("width", String(width));
  copy.setAttribute("height", String(height));
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.style.background = getComputedStyle(document.body).backgroundColor;

  const blob = new Blob([new XMLSerializer().serializeToString(copy)], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image"));
      img.src = url;
    });
    const ratio = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(ratio, ratio);
    ctx.drawImage(img, 0, 0, width, height);
    const png = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (!png) throw new Error("png");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(png);
    a.download = `${name.trim().replace(/[^\w-]+/g, "-") || "plan"}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } finally {
    URL.revokeObjectURL(url);
  }
}
