import { unzipSync, strFromU8 } from 'fflate';
export function readExport(bytes, filename = 'export.zip') {
    let data;
    try {
        if (filename.toLowerCase().endsWith('.zip')) {
            const files = unzipSync(new Uint8Array(bytes), { filter: f => f.name.split('/').pop() === 'trackbear-progress-data.json' && f.originalSize <= 20_000_000 });
            const entry = Object.keys(files).find(k => k.split('/').pop() === 'trackbear-progress-data.json');
            if (!entry) throw Error('The ZIP needs trackbear-progress-data.json. Choose the original TrackBear export.');
            data = JSON.parse(strFromU8(files[entry]));
        } else data = JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) { throw Error(e.message.startsWith('The ZIP') ? e.message : 'This file could not be read as a TrackBear export. Choose its ZIP or JSON file.'); }
    return validate(data);
}
export function validate(data) {
    if (!data || !Array.isArray(data.tallies) || !Array.isArray(data.projects)) throw Error('Expected TrackBear projects and tallies in this export.');
    const seen = new Set(), tallies = [];
    for (const t of data.tallies) {
        if (t.state !== 'active' || t.measure !== 'word') continue;
        const id = String(t.id ?? t.uuid ?? ''); if (id && seen.has(id)) throw Error('Duplicate tally IDs found. Please export again.'); seen.add(id);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date) || new Date(t.date + 'T00:00:00Z').toISOString().slice(0, 10) !== t.date) throw Error('An entry has an invalid date.');
        const count = Number(t.count); if (!Number.isSafeInteger(count) || count < 0) throw Error('Negative or invalid word counts need to be resolved before making a skyline.');
        tallies.push({ date: t.date, count, workId: String(t.workId) });
    }
    if (!tallies.length) throw Error('No active word-count entries were found.');
    return { tallies, projects: data.projects.map(p => ({ id: String(p.id), title: String(p.title || 'Untitled project') })).filter(p => tallies.some(t => t.workId === p.id)) };
}
export function summarize(data, project, year, cutoff) {
    const start = `${year}-01-01`, limit = cutoff < `${year}-12-31` ? cutoff : `${year}-12-31`;
    const rows = data.tallies.filter(t => (project === 'all' || t.workId === project) && t.date >= start && t.date <= limit);
    if (!rows.length) throw Error('No word entries for this project and year before the selected cutoff.');
    const end = rows.reduce((a, t) => t.date > a ? t.date : a, start), counts = new Map(); for (const t of rows) counts.set(t.date, (counts.get(t.date) || 0) + t.count);
    const startMs = Date.parse(start + 'T00:00:00Z'), offset = (new Date(startMs).getUTCDay() + 6) % 7, origin = startMs - offset * 86400000;
    const days = []; let run = 0, longest = 0, total = 0, active = 0;
    for (let ms = startMs; ms <= Date.parse(end + 'T00:00:00Z'); ms += 86400000) { const date = new Date(ms).toISOString().slice(0, 10), words = counts.get(date) || 0, i = (ms - origin) / 86400000; days.push({ date, words, logged: counts.has(date), week: Math.floor(i / 7), day: i % 7 }); total += words; if (words) { active++; run++; longest = Math.max(longest, run); } else run = 0; }
    const peak = days.reduce((a, d) => d.words > a.words ? d : a, days[0]); return { days, end, total, active, longest, peak, weeks: days.at(-1).week + 1 };
}
export function sampleData() { const tallies = []; for (let i = 0; i < 180; i++) { const d = new Date(Date.UTC(2026, 0, 1 + i)); if (i % 11 === 0) continue; const count = Math.round(45 + Math.abs(Math.sin(i * 1.71)) * 380 + (i % 17 === 0 ? 650 : 0)); tallies.push({ date: d.toISOString().slice(0, 10), count, workId: 'sample' }); } return { projects: [{ id: 'sample', title: 'A year of little beginnings' }], tallies }; }
