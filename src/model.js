import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
export function generateModel(summary, title, scale, fontData) {
    const group = new THREE.Group(), material = new THREE.MeshBasicMaterial();
    const width = (summary.weeks + 4) * 2.5, depth = 27.5;
    function box(x, y, z, w, d, h) { const geometry = new THREE.BoxGeometry(w, d, h); geometry.translate(x + w / 2, y + d / 2, z + h / 2); group.add(new THREE.Mesh(geometry, material)); }
    box(0, 0, -10, width, depth, 10);
    for (const d of summary.days) { if (d.words <= 0) continue; const ratio = d.words / summary.peak.words; const h = scale === 'raw' ? 25 * ratio : 2.5 + 22.5 * Math.sqrt(ratio); box(5 + d.week * 2.5, 5 + d.day * 2.5, -.1, 2.5, 2.5, h + .1); }
    const font = new FontLoader().parse(fontData);
    function lettering(text, left, right) { const shapes = font.generateShapes(text, 5); if (!shapes.length) return; const geo = new THREE.ExtrudeGeometry(shapes, { depth: .8, bevelEnabled: false, curveSegments: 5 }); geo.computeBoundingBox(); const b = geo.boundingBox; const factor = Math.min((right - left) / (b.max.x - b.min.x), 4.2 / (b.max.y - b.min.y), 1); const bw = (b.max.x - b.min.x) * factor, bh = (b.max.y - b.min.y) * factor; geo.translate(-b.min.x, -b.min.y, 0); geo.scale(factor, factor, 1); geo.rotateX(Math.PI / 2); geo.translate(left, 0.15, -5 - bh / 2); group.add(new THREE.Mesh(geo, material)); return bw; }
    lettering(title, 5, width * .54); lettering('as of ' + summary.end.replaceAll('-', '.'), width * .59, width - 3);
    group.updateMatrixWorld(true); const stl = new STLExporter().parse(group, { binary: true }); group.traverse(o => o.geometry?.dispose()); material.dispose(); return { buffer: stl.buffer, width, depth, triangles: stl.getUint32(80, true) };
}
