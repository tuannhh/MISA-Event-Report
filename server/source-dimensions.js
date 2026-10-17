// Source dimensions preserve the original column labels; no contact values go to AI discovery.
const normalized = value => String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/đ/g, 'd').trim();
export function isStaffDimension(header) {
  return /(nhan vien|nguoi moi|nguoi phu trach|nguoi tiep nhan|ten tiep nhan|staff|employee|assignee|sales.?rep|^owner$)/.test(normalized(header));
}
export function safeSourceHeader(header) {
  const n = normalized(header);
  return header.length <= 200 && !['__proto__', 'constructor', 'prototype'].includes(header)
    && !/(email|e-mail|dien thoai|phone|address|dia chi|mat khau|password)/.test(n)
    && (isStaffDimension(header)||!/(ho va ten|full.?name)/.test(n));
}
export function guessSourceColumns(headers) {
  return headers.filter(h => safeSourceHeader(h) && (isStaffDimension(h) || /(nguon|source|utm[ _]|tracking|kenh|channel|chien dich|campaign|doi tac|partner|gioi thieu|referr|hiep hoi|don vi moi|ma moi)/.test(normalized(h)))).slice(0, 12);
}
export function validateSourceColumns(headers, columns) {
  if (!Array.isArray(columns) || columns.length > 12 || columns.some(c => typeof c !== 'string' || !headers.includes(c) || !safeSourceHeader(c)) || new Set(columns).size !== columns.length) {
    throw Object.assign(new Error('Chọn tối đa 12 cột nguồn khách hợp lệ, không trùng và không phải thông tin liên hệ cá nhân.'), {status: 400});
  }
  return columns;
}
export function sourceValues(row) {
  return row.source_details && Object.keys(row.source_details).length ? row.source_details : {'Nguồn khách': row.source || '', 'Mã tracking': row.tracking || ''};
}
export function matchesSources(row, filters = {}) {
  const values = sourceValues(row);
  return Object.entries(filters).every(([key, value]) => String(values[key] ?? '') === value);
}
export function sourceBreakdowns(rows) {
  const columns = [...new Set(rows.flatMap(r => Object.keys(sourceValues(r))))].sort((a, b) => a.localeCompare(b, 'vi'));
  return columns.map(name => {
    const counts = new Map();
    for (const row of rows) { const value = String(sourceValues(row)[name] ?? ''); counts.set(value, (counts.get(value) || 0) + 1); }
    const values = [...counts].map(([value, count]) => ({value, label: value || 'Chưa xác định', count, percent: rows.length ? Math.round(count / rows.length * 10000) / 100 : null})).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'vi'));
    return {name, values};
  });
}
