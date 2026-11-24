import { DEFAULT_ENGINEERING_STATE, calculateConnectedObjects, dependencyImpact, createRevision } from './universe-core.mjs';

const $ = id => document.getElementById(id);
const REGIONS = [
  ['World Explorer', '◎'], ['Command Center', '⌁'], ['Product Lab', '◈'], ['Engineering Studio', '◇'],
  ['Production Center', '▦'], ['Client Center', '♧'], ['Fridge Network', '▥'], ['Logistics Center', '↗'],
  ['Memory Center', '◫'], ['Intelligence Center', '✦'], ['Developer Studio', '⌘'],
];
const STORAGE = 'onda-universe-engine-alpha';
const form = $('parameter-form');
let saved = {};
try { saved = JSON.parse(localStorage.getItem(STORAGE) || '{}'); } catch { saved = {}; }
let state = { ...DEFAULT_ENGINEERING_STATE, ...(saved.state || {}) };
let previous = { ...state };
let revisions = Array.isArray(saved.revisions) ? saved.revisions : [];

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $('toast').classList.remove('show'), 2200);
}
function persist() { localStorage.setItem(STORAGE, JSON.stringify({ state, revisions: revisions.slice(-20) })); }
function readForm() { return Object.fromEntries([...new FormData(form)].map(([key, value]) => [key, Number(value)])); }
function writeForm(value) { Object.entries(value).forEach(([key, val]) => { if (form.elements[key]) form.elements[key].value = val; }); }

function drawTray(result) {
  const canvas = $('tray-canvas'), ratio = Math.min(devicePixelRatio, 2), width = canvas.clientWidth, height = canvas.clientHeight;
  canvas.width = width * ratio; canvas.height = height * ratio;
  const ctx = canvas.getContext('2d'); ctx.scale(ratio, ratio); ctx.clearRect(0, 0, width, height);
  const pad = 34, scale = Math.min((width - pad * 2) / state.shelfWidth, (height - pad * 2) / state.shelfDepth);
  const ox = (width - state.shelfWidth * scale) / 2, oy = (height - state.shelfDepth * scale) / 2;
  ctx.strokeStyle = '#648aa2'; ctx.lineWidth = 1.5; ctx.strokeRect(ox, oy, state.shelfWidth * scale, state.shelfDepth * scale);
  ctx.fillStyle = '#65c7ec12'; ctx.fillRect(ox, oy, state.shelfWidth * scale, state.shelfDepth * scale);
  const trayX = ox + result.edgeClearanceX * scale, trayY = oy + result.edgeClearanceZ * scale;
  ctx.strokeStyle = '#ffe629'; ctx.setLineDash([5, 4]); ctx.strokeRect(trayX, trayY, result.trayWidth * scale, result.trayDepth * scale); ctx.setLineDash([]);
  for (let row = 0; row < result.rows; row++) for (let col = 0; col < result.columns; col++) {
    const x = trayX + (col * (state.cupDiameter + state.gap) + state.cupDiameter / 2) * scale;
    const y = trayY + (row * (state.cupDiameter + state.gap) + state.cupDiameter / 2) * scale;
    const gradient = ctx.createRadialGradient(x - 4, y - 5, 2, x, y, state.cupDiameter * scale / 2);
    gradient.addColorStop(0, '#fff5ce'); gradient.addColorStop(.55, '#d99b3f'); gradient.addColorStop(1, '#57351f');
    ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(x, y, state.cupDiameter * scale / 2 - 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffe8a8aa'; ctx.stroke();
  }
  ctx.fillStyle = '#91a8b8'; ctx.font = '10px ui-monospace'; ctx.fillText(`${state.shelfWidth} mm`, ox + 4, oy - 10);
}

function renderHistory() {
  $('history').replaceChildren(...revisions.slice().reverse().map((revision, index) => {
    const li = document.createElement('li');
    li.innerHTML = `<b>v${revisions.length - index}</b><span>${new Date(revision.createdAt).toLocaleString()} · ${revision.impact.changed.join(', ') || 'baseline'}</span><strong>${revision.result.totalCapacity} cups</strong>`;
    return li;
  }));
  if (!revisions.length) $('history').innerHTML = '<li><span>No saved revisions yet</span></li>';
}

function render() {
  try {
    const next = readForm(), result = calculateConnectedObjects(next), impact = dependencyImpact(previous, next);
    state = next; $('form-error').textContent = '';
    $('capacity').textContent = result.totalCapacity; $('grid-result').textContent = `${result.columns} × ${result.rows}`;
    $('shelf-result').textContent = `${result.cupsPerShelf} cups`; $('mass-result').textContent = `${result.estimatedMassKg.toFixed(2)} kg`;
    $('cost-result').textContent = `$${result.estimatedMaterialCost.toFixed(2)}`; $('tray-dimensions').textContent = `TRAY ${result.trayWidth} × ${result.trayDepth} mm`;
    $('clearance').textContent = `EDGE ${result.edgeClearanceX.toFixed(1)} / ${result.edgeClearanceZ.toFixed(1)} mm`; $('formula').textContent = result.formula;
    const source = [...impact.changed.map(name => `<span class="node changed">${name}</span>`), '<span class="arrow">→</span>', ...impact.affected.map(name => `<span class="node changed">${name}</span>`)];
    $('impact-graph').innerHTML = source.length > 1 ? source.join('') : '<span class="node">Edit a parameter to trace impact</span>';
    drawTray(result); persist();
  } catch (error) { $('form-error').textContent = error.message; }
}

function selectRegion(name) {
  $('current-region').textContent = name;
  document.querySelectorAll('#region-nav button').forEach(button => button.classList.toggle('active', button.dataset.region === name));
  if (name === 'Engineering Studio') $('workspace').scrollIntoView({ behavior: 'smooth' });
  else if (name !== 'World Explorer') toast(`${name}: workspace module planned, not connected yet`);
}

REGIONS.forEach(([name, icon]) => {
  const button = document.createElement('button'); button.dataset.region = name; button.innerHTML = `<span>${icon}</span>${name.replace(' Center', '')}`;
  button.onclick = () => selectRegion(name); $('region-nav').append(button);
  const fallback = button.cloneNode(true); fallback.onclick = () => selectRegion(name); $('fallback-regions').append(fallback);
});
selectRegion('World Explorer'); writeForm(state); form.addEventListener('input', render); window.addEventListener('resize', render);
$('restore-defaults').onclick = () => { previous = { ...state }; state = { ...DEFAULT_ENGINEERING_STATE }; writeForm(state); render(); toast('Illustrative demo parameters restored'); };
$('save-revision').onclick = () => { try { const result = calculateConnectedObjects(state); revisions.push(createRevision(state, result, previous)); previous = { ...state }; persist(); renderHistory(); render(); toast(`Revision v${revisions.length} saved locally`); } catch (error) { $('form-error').textContent = error.message; } };
$('enter-engineering').onclick = () => selectRegion('Engineering Studio');
$('command-button').onclick = () => toast('Command palette is planned, not connected yet');
renderHistory(); render();

try {
  const { mountWorld } = await import('./world.mjs');
  const world = mountWorld($('world3d'), selectRegion);
  $('reset-camera').onclick = world.reset;
  $('render-status').textContent = 'REAL-TIME 3D · DEMO WORLD';
} catch (error) {
  $('world3d').hidden = true; $('world-fallback').hidden = false; $('render-status').textContent = '2D FALLBACK ACTIVE';
  console.error('3D world unavailable', error);
}
