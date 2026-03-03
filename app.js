// Draw a Loop! - ゲームロジック
const CELL = 48;
const MARGIN = 24;
const DOT_R = 7;
const NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
}

// ================== PuzzleState ==================
class PuzzleState {
    constructor(puzzle, container) {
        this.puzzle = puzzle;
        this.rows = puzzle.grid.length;
        this.cols = puzzle.grid[0].length;
        this.hEdges = Array.from({ length: this.rows + 1 }, () => new Array(this.cols).fill(false));
        this.vEdges = Array.from({ length: this.rows }, () => new Array(this.cols + 1).fill(false));
        this.solved = false;
        this.edgeEls = {};
        this.container = container;
        this.build();
    }

    isCell(r, c) {
        return r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.puzzle.grid[r][c] === 1;
    }

    hClickable(r, c) { return this.isCell(r - 1, c) || this.isCell(r, c); }
    vClickable(r, c) { return this.isCell(r, c - 1) || this.isCell(r, c); }

    toggleH(r, c) {
        if (this.solved || !this.hClickable(r, c)) return;
        this.hEdges[r][c] = !this.hEdges[r][c];
        this.repaintEdge('h', r, c);
        this.check();
    }

    toggleV(r, c) {
        if (this.solved || !this.vClickable(r, c)) return;
        this.vEdges[r][c] = !this.vEdges[r][c];
        this.repaintEdge('v', r, c);
        this.check();
    }

    repaintEdge(type, r, c) {
        const el = this.edgeEls[`${type}-${r}-${c}`];
        if (!el) return;
        const active = type === 'h' ? this.hEdges[r][c] : this.vEdges[r][c];
        el.setAttribute('stroke', active ? '#1e3a8a' : 'transparent');
        el.setAttribute('stroke-width', active ? '4' : '0');
        el.setAttribute('stroke-linecap', 'round');
    }

    // ---- Win check ----
    check() {
        if (this.hasValidLoop() && this.allDotsEnclosed()) {
            this.solved = true;
            this.onSolved();
        }
    }

    hasValidLoop() {
        const deg = {}, adj = {};
        const addE = (a, b) => {
            deg[a] = (deg[a] || 0) + 1;
            deg[b] = (deg[b] || 0) + 1;
            (adj[a] = adj[a] || []).push(b);
            (adj[b] = adj[b] || []).push(a);
        };
        for (let r = 0; r <= this.rows; r++)
            for (let c = 0; c < this.cols; c++)
                if (this.hEdges[r][c]) addE(`${r},${c}`, `${r},${c + 1}`);
        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c <= this.cols; c++)
                if (this.vEdges[r][c]) addE(`${r},${c}`, `${r + 1},${c}`);

        const verts = Object.keys(deg);
        if (verts.length === 0) return false;
        for (const v of verts) if (deg[v] !== 2) return false;

        // connectivity BFS
        const vis = new Set([verts[0]]);
        const q = [verts[0]];
        while (q.length) {
            const cur = q.pop();
            for (const nb of (adj[cur] || [])) {
                if (!vis.has(nb)) { vis.add(nb); q.push(nb); }
            }
        }
        return vis.size === verts.length;
    }

    allDotsEnclosed() {
        if (this.puzzle.dots.length === 0) return true;
        const R = this.rows, C = this.cols;
        const outside = new Set();
        const enc = (r, c) => `${r},${c}`;

        // can move from (r1,c1) to (r2,c2) without crossing an active edge?
        const canMove = (r1, c1, r2, c2) => {
            if (r1 === r2) {
                const c = Math.min(c1, c2) + 1;
                if (r1 >= 0 && r1 < R && c >= 0 && c <= C) return !this.vEdges[r1][c];
                return true;
            } else {
                const r = Math.min(r1, r2) + 1;
                if (c1 >= 0 && c1 < C && r >= 0 && r <= R) return !this.hEdges[r][c1];
                return true;
            }
        };

        // BFS from virtual border cells (-1‥R, -1‥C)
        const q = [];
        const seed = (r, c) => { const k = enc(r, c); if (!outside.has(k)) { outside.add(k); q.push([r, c]); } };
        for (let c = -1; c <= C; c++) { seed(-1, c); seed(R, c); }
        for (let r = 0; r < R; r++) { seed(r, -1); seed(r, C); }

        let i = 0;
        while (i < q.length) {
            const [r, c] = q[i++];
            for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
                if (nr < -1 || nr > R || nc < -1 || nc > C) continue;
                if (outside.has(enc(nr, nc))) continue;
                if (canMove(r, c, nr, nc)) seed(nr, nc);
            }
        }
        return this.puzzle.dots.every(d => !outside.has(enc(d.r, d.c)));
    }

    onSolved() {
        // Flash overlay on the SVG
        const overlay = this.container.querySelector('.solved-overlay');
        if (overlay) overlay.classList.remove('hidden');
        showToast();
    }

    reset() {
        this.hEdges = Array.from({ length: this.rows + 1 }, () => new Array(this.cols).fill(false));
        this.vEdges = Array.from({ length: this.rows }, () => new Array(this.cols + 1).fill(false));
        this.solved = false;
        const overlay = this.container.querySelector('.solved-overlay');
        if (overlay) overlay.classList.add('hidden');
        // repaint all edges
        for (let r = 0; r <= this.rows; r++)
            for (let c = 0; c < this.cols; c++)
                this.repaintEdge('h', r, c);
        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c <= this.cols; c++)
                this.repaintEdge('v', r, c);
    }

    // ---- Build SVG ----
    build() {
        const W = this.cols * CELL + MARGIN * 2;
        const H = this.rows * CELL + MARGIN * 2;
        const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });

        // Active cells background
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.puzzle.grid[r][c]) continue;
                svg.appendChild(svgEl('rect', {
                    x: MARGIN + c * CELL, y: MARGIN + r * CELL,
                    width: CELL, height: CELL,
                    fill: '#f0f4ff', stroke: '#c7d2f0', 'stroke-width': '0.5'
                }));
            }
        }

        // Dots (circles)
        for (const d of this.puzzle.dots) {
            const cx = MARGIN + d.c * CELL + CELL / 2;
            const cy = MARGIN + d.r * CELL + CELL / 2;
            svg.appendChild(svgEl('circle', { cx, cy, r: DOT_R + 2, fill: 'white', stroke: '#1e3a8a', 'stroke-width': '2.5' }));
            svg.appendChild(svgEl('circle', { cx, cy, r: DOT_R - 3, fill: '#1e3a8a' }));
        }

        // Clickable horizontal edges
        for (let r = 0; r <= this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.hClickable(r, c)) continue;
                const x1 = MARGIN + c * CELL;
                const y = MARGIN + r * CELL;
                const x2 = x1 + CELL;

                // visible line (drawn on top)
                const line = svgEl('line', { x1, y1: y, x2, y2: y, stroke: 'transparent', 'stroke-width': '0', 'stroke-linecap': 'round' });
                svg.appendChild(line);
                this.edgeEls[`h-${r}-${c}`] = line;

                // hit area
                const hit = svgEl('rect', {
                    x: x1, y: y - 8, width: CELL, height: 16,
                    fill: 'transparent', cursor: 'pointer'
                });
                hit.addEventListener('click', () => this.toggleH(r, c));
                hit.addEventListener('mouseover', () => { if (!this.solved) hit.setAttribute('fill', 'rgba(100,130,255,0.12)'); });
                hit.addEventListener('mouseout', () => hit.setAttribute('fill', 'transparent'));
                svg.appendChild(hit);
            }
        }

        // Clickable vertical edges
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c <= this.cols; c++) {
                if (!this.vClickable(r, c)) continue;
                const x = MARGIN + c * CELL;
                const y1 = MARGIN + r * CELL;
                const y2 = y1 + CELL;

                const line = svgEl('line', { x1: x, y1, x2: x, y2, stroke: 'transparent', 'stroke-width': '0', 'stroke-linecap': 'round' });
                svg.appendChild(line);
                this.edgeEls[`v-${r}-${c}`] = line;

                const hit = svgEl('rect', {
                    x: x - 8, y: y1, width: 16, height: CELL,
                    fill: 'transparent', cursor: 'pointer'
                });
                hit.addEventListener('click', () => this.toggleV(r, c));
                hit.addEventListener('mouseover', () => { if (!this.solved) hit.setAttribute('fill', 'rgba(100,130,255,0.12)'); });
                hit.addEventListener('mouseout', () => hit.setAttribute('fill', 'transparent'));
                svg.appendChild(hit);
            }
        }

        this.container.querySelector('.svg-wrap').appendChild(svg);
    }
}

// ================== Toast ==================
function showToast() {
    const t = document.getElementById('toast');
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 2500);
}

// ================== Render sets ==================
function renderAll() {
    const root = document.getElementById('sets-container');
    for (const set of PUZZLE_SETS) {
        const setDiv = document.createElement('div');
        setDiv.innerHTML = `
      <h2 class="caveat text-3xl font-bold mb-5" style="color:#2563eb">${set.name}</h2>
      <div class="puzzles-row flex flex-wrap gap-6"></div>
    `;
        const row = setDiv.querySelector('.puzzles-row');

        for (const puzzle of set.puzzles) {
            const card = document.createElement('div');
            card.className = 'puzzle-card bg-white rounded-xl shadow-md p-4 relative select-none';
            card.innerHTML = `
        <div class="svg-wrap mb-2"></div>
        <div class="solved-overlay hidden absolute inset-0 bg-green-400/20 rounded-xl flex items-center justify-center">
          <span class="caveat text-3xl font-bold text-green-700">✓ Solved!</span>
        </div>
        <div class="flex items-center justify-between mt-1">
          <span class="caveat text-sm text-gray-400">#${puzzle.id}</span>
          <button class="reset-btn caveat text-xs text-gray-400 hover:text-gray-700 border border-gray-300 rounded px-2 py-0.5 transition">リセット</button>
        </div>
      `;
            row.appendChild(card);

            const state = new PuzzleState(puzzle, card);
            card.querySelector('.reset-btn').addEventListener('click', () => state.reset());
        }
        root.appendChild(setDiv);
    }
}

document.addEventListener('DOMContentLoaded', renderAll);
