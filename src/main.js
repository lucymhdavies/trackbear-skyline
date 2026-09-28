import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { sampleData, summarize } from './data.js';
const $ = id => document.getElementById(id), worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' }); let seq = 0; const jobs = new Map();
worker.onmessage = ({ data }) => { const j = jobs.get(data.id); if (j) { jobs.delete(data.id); data.error ? j.reject(Error(data.error)) : j.resolve(data.result); } };
worker.onerror = () => { for (const j of jobs.values()) j.reject(Error('The model generator stopped. Please refresh and try again.')); jobs.clear(); };
function job(data) { return new Promise((resolve, reject) => { const id = ++seq; jobs.set(id, { resolve, reject }); worker.postMessage({ ...data, id }, data.bytes ? [data.bytes] : []); }); }
let data = sampleData(), isSample = true, summary, stlBuffer, revision = 0, timer, mesh, downloadURL, renderer, camera, controls, scene;
const today = new Date().toLocaleDateString('en-CA');
const fontPromise = fetch('./model-font.json').then(r => { if (!r.ok) throw Error('The model font could not load. Please refresh.'); return r.json(); });
try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setClearColor(0xffffff, 0); renderer.outputColorSpace = THREE.SRGBColorSpace; $('viewport').prepend(renderer.domElement); renderer.domElement.setAttribute('aria-label', 'Interactive preview of the downloadable STL model'); renderer.domElement.setAttribute('role', 'img');
    scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight(0xffffff, 0xb1afd0, 2.7)); const light = new THREE.DirectionalLight(0xffffff, 3.2); light.position.set(-35, -60, 110); scene.add(light); const fill = new THREE.DirectionalLight(0xffffff, 1); fill.position.set(70, 50, 40); scene.add(fill);
    camera = new THREE.PerspectiveCamera(32, 1, .1, 1500); camera.up.set(0, 0, 1); controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.minDistance = 25; controls.maxDistance = 500; controls.maxPolarAngle = Math.PI * .88;
    new ResizeObserver(() => { const { width, height } = $('viewport').getBoundingClientRect(); renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); }).observe($('viewport'));
    renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
} catch (e) { showError('3D preview needs WebGL in your browser. You can still generate and download an STL.'); }
function reset() { if (!camera || !summary) return; const width = (summary.weeks + 4) * 2.5; const distance = Math.max(width * .95 / camera.aspect, 75); camera.position.set(width * .65, -distance, Math.max(48, distance * .6)); controls.target.set(width / 2, 13, 1); controls.update(); }
$('reset').onclick = reset;
function showError(message) { $('error').textContent = message; $('error').hidden = false; }
function clearError() { $('error').hidden = true; }
function options() {
    $('project').replaceChildren(); for (const p of data.projects) { $('project').add(new Option(p.title, p.id)); } if (data.projects.length > 1) $('project').add(new Option('All projects', 'all'));
    projectChanged();
}
function projectChanged() {
    const p = data.projects.find(p => p.id === $('project').value); $('title').value = p ? p.title.slice(0, 36) : 'All writing';
    const years = [...new Set(data.tallies.filter(t => $('project').value === 'all' || t.workId === $('project').value).map(t => t.date.slice(0, 4)))].sort().reverse(); $('year').replaceChildren(...years.map(y => new Option(y, y)));
    const current = String(new Date().getFullYear()); if (years.includes(current)) $('year').value = current; setCutoff(); update(true);
}
function setCutoff() { const y = $('year').value; const latest = data.tallies.filter(t => (t.workId === $('project').value || $('project').value === 'all') && t.date.startsWith(y) && t.date <= today).map(t => t.date).sort().at(-1); $('cutoff').value = latest || `${y}-12-31`; $('cutoff').max = today; $('cutoff').min = `${y}-01-01`; }
function renderCalendar() {
    const c = $('calendar'); c.replaceChildren(); c.style.gridTemplateColumns = `repeat(${summary.weeks},minmax(0,1fr))`; const grid = new Map(summary.days.map(d => [`${d.week}/${d.day}`, d]));
    for (let w = 0; w < summary.weeks; w++)for (let day = 0; day < 7; day++) { const d = grid.get(`${w}/${day}`); if (!d) { const blank = document.createElement('span'); c.append(blank); continue; } const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', `${d.date}: ${d.words.toLocaleString()} words`); b.title = `${d.date}: ${d.words.toLocaleString()} words`; if (d.words) { const level = .22 + .78 * Math.sqrt(d.words / summary.peak.words); b.style.background = `rgba(104,97,245,${level})`; } const inspect = () => { $('day-detail').textContent = `${new Date(d.date + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · ${d.words.toLocaleString()} words${!d.logged ? ' · no entry' : ''}`; }; b.onmouseenter = inspect; b.onfocus = inspect; b.onclick = inspect; c.append(b); }
}
async function update(reframe = false) {
    const version = ++revision; clearTimeout(timer); stlBuffer = null; $('download').disabled = true; clearError();
    try {
        if (!$('cutoff').value) throw Error('Choose a cutoff date.'); if ($('cutoff').value > today) throw Error('The cutoff cannot be in the future.');
        if (!$('title').value.trim()) throw Error('Give your skyline a title.');
        summary = summarize(data, $('project').value, Number($('year').value), $('cutoff').value);
        const scale = document.querySelector('[name=scale]:checked').value, title = $('title').value.trim();
        $('model-heading').textContent = title; $('period').textContent = `1 Jan – ${new Date(summary.end + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;
        $('total').textContent = summary.total.toLocaleString(); $('active').textContent = summary.active; $('streak').textContent = summary.longest; $('peak').textContent = `Peak: ${summary.peak.words.toLocaleString()} words`;
        $('scale-help').textContent = scale === 'raw' ? 'Height is directly proportional to words. Twice the words, twice the height.' : 'Gives even your smallest writing days a place in the skyline.';
        $('day-detail').textContent = 'Select a day to see its words'; renderCalendar(); $('loading').hidden = false; $('loading').textContent = 'Building your skyline…'; $('file-meta').textContent = 'Preparing your model…';
        const font = await fontPromise; if (version !== revision) return; const result = await job({ kind: 'generate', summary, title, scale, font }); if (version !== revision) return;
        stlBuffer = result.buffer;
        if (scene) { const geo = new STLLoader().parse(stlBuffer); if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); } mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x8175ea, roughness: .62, metalness: .05 })); scene.add(mesh); if (reframe) reset(); }
        $('loading').hidden = true; $('download').disabled = false; $('file-meta').textContent = `${(stlBuffer.byteLength / 1e6).toFixed(2)} MB · ${result.triangles.toLocaleString()} triangles · millimetres`;
    } catch (e) { if (version !== revision) return; showError(e.message); $('loading').hidden = true; $('file-meta').textContent = 'Check the settings above.'; if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); mesh = null; } }
}
async function importFile(file) { if (!file) return; clearError(); if (file.size > 20_000_000) { showError('Please choose an export smaller than 20 MB.'); return; } $('source').textContent = 'Reading your export…'; try { const bytes = await file.arrayBuffer(); const imported = await job({ kind: 'import', bytes, name: file.name }); data = imported; isSample = false; $('source').textContent = file.name; $('sample-badge').hidden = true; options(); } catch (e) { showError(e.message); $('source').textContent = isSample ? 'Exploring sample data' : 'Previous export retained'; } $('file').value = ''; }
$('file').onchange = e => importFile(e.target.files[0]); $('drop').ondragover = e => { e.preventDefault(); $('drop').classList.add('drag'); }; $('drop').ondragleave = () => $('drop').classList.remove('drag'); $('drop').ondrop = e => { e.preventDefault(); $('drop').classList.remove('drag'); importFile(e.dataTransfer.files[0]); };
$('project').onchange = projectChanged; $('year').onchange = () => { setCutoff(); update(true); }; $('cutoff').onchange = () => update(true); $('title').oninput = () => { ++revision; $('download').disabled = true; clearTimeout(timer); timer = setTimeout(() => update(), 300); }; for (const radio of document.querySelectorAll('[name=scale]')) radio.onchange = () => update();
$('sample').onclick = () => { data = sampleData(); isSample = true; $('source').textContent = 'Exploring sample data'; $('sample-badge').hidden = false; options(); };
$('download').onclick = () => { if (!stlBuffer) return; if (downloadURL) URL.revokeObjectURL(downloadURL); downloadURL = URL.createObjectURL(new Blob([stlBuffer], { type: 'model/stl' })); const a = document.createElement('a'); a.href = downloadURL; const name = $('title').value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'writing'; a.download = `${name}-${summary.end}-${document.querySelector('[name=scale]:checked').value}.stl`; a.click(); };
options();
