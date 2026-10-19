export function heartPoints(count) {
  if (!Number.isInteger(count) || count < 1) return [];
  // Match the eight stars to the pixel heart's shoulders, sides and lower edges.
  if (count === 8) return [
    { x: 50, y: 30.75 }, { x: 71, y: 13.2425 },
    { x: 92.4, y: 37.4 }, { x: 70, y: 65.4575 },
    { x: 50, y: 89.05 }, { x: 30, y: 65.4575 },
    { x: 7.6, y: 37.4 }, { x: 29, y: 13.2425 }
  ];
  return Array.from({ length: count }, (_, index) => {
    // Put the sixth message at the tip while keeping the other five balanced.
    const t = count === 6 ? [0, 1, 2, 4, 5, 3][index] * Math.PI / 3 : index * Math.PI * 2 / count;
    return { x: 50 + 2.65 * 16 * Math.sin(t) ** 3, y: 44 - 2.65 * (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) };
  });
}
export function allViewed(stars, viewed) {
  return stars.length > 0 && stars.every((_, index) => viewed.has(index));
}
export function whatsappUrl(number, message) {
  return /^[1-9]\d{6,14}$/.test(number) ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}
