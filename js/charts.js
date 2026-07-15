/* ==========================================================================
   FlowOS — charts.js
   Small dependency-free SVG chart helpers: progress rings, heatmaps, bars.
   ========================================================================== */

const Charts = (() => {

  function ringSVG({ size = 120, stroke = 10, percent = 0, color = 'var(--accent-violet)', trackColor = 'var(--surface-3)' }) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const offset = c - (Utils.clamp(percent, 0, 100) / 100) * c;
    return `
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${trackColor}" stroke-width="${stroke}"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
          stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${offset}"
          transform="rotate(-90 ${size / 2} ${size / 2})"
          style="transition: stroke-dashoffset var(--dur-slow) var(--ease-out);"/>
      </svg>`;
  }

  // data: Map/object of dateKey -> count (0..n). weeks: number of weeks back.
  function heatmapCells(dataMap, weeks = 20) {
    const today = new Date();
    const end = Utils.startOfWeek(today, 0);
    end.setDate(end.getDate() + 6);
    const cells = [];
    const totalDays = weeks * 7;
    const start = Utils.addDays(end, -(totalDays - 1));
    // align start to a week boundary
    const alignedStart = Utils.startOfWeek(start, 0);
    for (let i = 0; i < totalDays + 7; i++) {
      const d = Utils.addDays(alignedStart, i);
      if (d > end) break;
      const key = Utils.dateKey(d);
      const count = dataMap[key] || 0;
      cells.push({ date: d, key, count });
    }
    return cells;
  }

  function heatmapLevelColor(count, max) {
    if (count <= 0) return 'var(--surface-2)';
    const ratio = max > 0 ? count / max : 1;
    if (ratio > 0.75) return 'var(--accent-green)';
    if (ratio > 0.5) return '#4fae66';
    if (ratio > 0.25) return '#3d7d4d';
    return '#2a5636';
  }

  function renderHeatmapGrid(container, dataMap, weeks = 20, cellSize = 11) {
    const cells = heatmapCells(dataMap, weeks);
    const max = Math.max(1, ...cells.map(c => c.count));
    const grid = document.createElement('div');
    grid.className = 'heatmap-grid';
    grid.style.gridTemplateColumns = `repeat(${Math.ceil(cells.length / 7)}, ${cellSize}px)`;
    cells.forEach(c => {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      cell.style.width = cellSize + 'px';
      cell.style.height = cellSize + 'px';
      cell.style.background = heatmapLevelColor(c.count, max);
      cell.title = `${Utils.formatDate(c.date)} — ${c.count} completed`;
      grid.appendChild(cell);
    });
    container.innerHTML = '';
    container.appendChild(grid);
  }

  // Simple inline bar chart as SVG. values: [{label, value}]
  function barChartSVG(values, { width = 560, height = 180, color = 'var(--accent-violet)' } = {}) {
    const max = Math.max(1, ...values.map(v => v.value));
    const padding = 24;
    const barGap = 10;
    const n = values.length;
    const barWidth = (width - padding * 2 - barGap * (n - 1)) / n;
    let bars = '';
    let labels = '';
    values.forEach((v, i) => {
      const h = Math.max(3, (v.value / max) * (height - 40));
      const x = padding + i * (barWidth + barGap);
      const y = height - 24 - h;
      bars += `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="5" fill="${color}" opacity="${0.55 + 0.45 * (v.value / max)}"><title>${v.label}: ${v.value}</title></rect>`;
      labels += `<text x="${x + barWidth / 2}" y="${height - 6}" text-anchor="middle" font-size="10" fill="var(--text-tertiary)" font-family="Inter">${v.label}</text>`;
    });
    return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">${bars}${labels}</svg>`;
  }

  function lineChartSVG(values, { width = 560, height = 180, color = 'var(--accent-teal)' } = {}) {
    const max = Math.max(1, ...values.map(v => v.value));
    const padding = 20;
    const n = values.length;
    const stepX = (width - padding * 2) / Math.max(1, n - 1);
    const points = values.map((v, i) => {
      const x = padding + i * stepX;
      const y = height - 24 - (v.value / max) * (height - 44);
      return [x, y];
    });
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
    const areaD = `${pathD} L ${points[points.length - 1][0]} ${height - 24} L ${points[0][0]} ${height - 24} Z`;
    const dots = points.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${color}"><title>${values[i].label}: ${values[i].value}</title></circle>`).join('');
    const labels = values.map((v, i) => `<text x="${points[i][0]}" y="${height - 6}" text-anchor="middle" font-size="10" fill="var(--text-tertiary)" font-family="Inter">${v.label}</text>`).join('');
    return `
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">
        <defs>
          <linearGradient id="lineFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${color}" stop-opacity="0.35"/>
            <stop offset="1" stop-color="${color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${areaD}" fill="url(#lineFade)" stroke="none"/>
        <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
        ${dots}${labels}
      </svg>`;
  }

  return { ringSVG, heatmapCells, heatmapLevelColor, renderHeatmapGrid, barChartSVG, lineChartSVG };
})();
