import { readExport } from './data.js';
import { generateModel } from './model.js';
self.onmessage = ({ data }) => { try { const result = data.kind === 'import' ? readExport(data.bytes, data.name) : generateModel(data.summary, data.title, data.scale, data.font); self.postMessage({ id: data.id, result }, result.buffer ? [result.buffer] : []); } catch (e) { self.postMessage({ id: data.id, error: e.message }); } };
