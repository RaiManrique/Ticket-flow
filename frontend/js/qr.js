function hashCode(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function qrCellOn(text, x, y, n) {
  const corner =
    (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  if (corner) {
    const lx = x < 7 ? x : x >= n - 7 ? x - (n - 7) : x;
    const ly = y < 7 ? y : y >= n - 7 ? y - (n - 7) : y;
    return (
      lx === 0 || ly === 0 || lx === 6 || ly === 6 ||
      (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4)
    );
  }
  return hashCode(`${text}:${x}:${y}`) % 2 === 0;
}

function qrSvg(text, moduleSize = 5) {
  const n = 21;
  const size = n * moduleSize;
  const cells = [];

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (qrCellOn(text, x, y, n)) {
        cells.push(
          `<rect x="${x * moduleSize}" y="${y * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="currentColor"/>`
        );
      }
    }
  }

  return `<svg class="ticket-qr-svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="QR simulado"><g>${cells.join("")}</g></svg>`;
}
