/* ==========================================================================
   FlowOS — utils.js
   Generic helpers: ids, dates, dom, formatting.
   ========================================================================== */

const Utils = (() => {

  function uid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
  }

  function debounce(fn, wait = 300) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---------------- Dates ---------------- */
  // Canonical key format: YYYY-MM-DD (local time, not UTC)
  function dateKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function keyToDate(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function isSameDay(a, b) {
    return dateKey(a) === dateKey(b);
  }

  function startOfWeek(date, weekStartsOn = 0) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  function monthName(date, short = false) {
    return date.toLocaleDateString('en-US', { month: short ? 'short' : 'long' });
  }

  function weekdayName(date, short = true) {
    return date.toLocaleDateString('en-US', { weekday: short ? 'short' : 'long' });
  }

  function formatDate(date, opts) {
    return date.toLocaleDateString('en-US', opts || { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatTime12(hhmm) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  function relativeTime(ts) {
    const diff = Date.now() - ts;
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}d ago`;
    return formatDate(new Date(ts));
  }

  function daysBetween(a, b) {
    const msPerDay = 1000 * 60 * 60 * 24;
    const da = new Date(dateKey(a));
    const db_ = new Date(dateKey(b));
    return Math.round((db_ - da) / msPerDay);
  }

  function todayKey() {
    return dateKey(new Date());
  }

  return {
    uid, clamp, debounce, escapeHtml,
    dateKey, keyToDate, addDays, isSameDay,
    startOfWeek, startOfMonth, endOfMonth,
    monthName, weekdayName, formatDate, formatTime12,
    relativeTime, daysBetween, todayKey
  };
})();
