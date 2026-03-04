// Draw a Loop! - ゲームロジック（セル移動方式）
// セルをクリック/ドラッグして一筆書きのループを描く

const MARGIN = 16;
const NS = 'http://www.w3.org/2000/svg';

// パズルのサイズに応じてセルサイズを動的決定
function getCellSize(puzzle) {
    const cols = puzzle.grid[0].length;
    if (cols >= 30) return 18;   // 大グリッド（フリープレイ）
    if (cols >= 6) return 36;   // 中グリッド
    return 52;                   // 小パズル
}

function svgEl(tag, attrs = {}) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
}

// ================== PuzzleState ==================
class PuzzleState {
    constructor(puzzle, container) {
        this.puzzle = puzzle;
        this.CELL = getCellSize(puzzle);
        this.rows = puzzle.grid.length;
        this.cols = puzzle.grid[0].length;
        this.path = [];
        this.pathSet = new Set();
        this.drawing = false;
        this.solved = false;
        this.container = container;
        this.cellEls = {};
        this.pathLineEls = [];
        this.svgEl = null;
        this.build();
    }

    isCell(r, c) {
        return r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.puzzle.grid[r][c] === 1;
    }

    totalCells() {
        let n = 0;
        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++)
                if (this.puzzle.grid[r][c] === 1) n++;
        return n;
    }

    isAdjacent(a, b) {
        return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
    }

    cellKey(r, c) { return `${r},${c}`; }

    isDot(r, c) {
        return this.puzzle.dots.some(d => d.r === r && d.c === c);
    }

    // ---- ○と○の間の線をクリックでキャンセル ----
    clickSegment(segIdx) {
        if (this.solved) return;
        const a = this.path[segIdx];
        const b = this.path[segIdx + 1];
        if (!a || !b) return;
        if (this.isDot(a.r, a.c) && this.isDot(b.r, b.c)) {
            const removed = this.path.splice(segIdx + 1);
            for (const cell of removed) this.pathSet.delete(this.cellKey(cell.r, cell.c));
            this.drawing = false;
            this.redrawPath();
        }
    }

    // ---- パスを開始 ----
    startPath(r, c) {
        if (this.solved || !this.isCell(r, c)) return;
        this.path = [{ r, c }];
        this.pathSet = new Set([this.cellKey(r, c)]);
        this.drawing = true;
        this.redrawPath();
    }

    // ---- セルを追加 ----
    extendPath(r, c) {
        if (!this.drawing || !this.isCell(r, c)) return;
        const last = this.path[this.path.length - 1];
        const key = this.cellKey(r, c);

        // 直前のセルに戻るならアンドゥ
        if (this.path.length >= 2) {
            const prev = this.path[this.path.length - 2];
            if (prev.r === r && prev.c === c) {
                this.pathSet.delete(this.cellKey(last.r, last.c));
                this.path.pop();
                this.redrawPath();
                return;
            }
        }

        if (this.pathSet.has(key)) return;
        if (!this.isAdjacent(last, { r, c })) return;

        this.path.push({ r, c });
        this.pathSet.add(key);
        this.redrawPath();
    }

    // ---- ドラッグ終了 → ループ完成チェック ----
    endPath() {
        if (!this.drawing) return;
        this.drawing = false;

        if (this.path.length < 3) { this.reset(); return; }

        const first = this.path[0];
        const last = this.path[this.path.length - 1];
        const isClosed = this.isAdjacent(first, last);

        if (this.puzzle.freePlay) {
            // フリーモード: 閉じたループなら何セルでもOK
            if (isClosed) {
                this.solved = true;
                this.showSolved();
            }
        } else {
            // 通常モード: 全セル通過 + 閉じたループ
            if (isClosed && this.path.length === this.totalCells()) {
                this.solved = true;
                this.showSolved();
            }
        }
    }

    // ---- パスの再描画 ----
    redrawPath() {
        for (const el of this.pathLineEls) el.remove();
        this.pathLineEls = [];

        const C = this.CELL;

        // セル色を更新
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.puzzle.grid[r][c]) continue;
                const el = this.cellEls[this.cellKey(r, c)];
                if (!el) continue;
                el.setAttribute('fill', this.pathSet.has(this.cellKey(r, c)) ? '#dbeafe' : '#f0f4ff');
            }
        }

        // セグメント線を描画
        const lw = C >= 40 ? 6 : 4;
        for (let i = 0; i < this.path.length - 1; i++) {
            const a = this.path[i];
            const b = this.path[i + 1];
            const x1 = MARGIN + a.c * C + C / 2;
            const y1 = MARGIN + a.r * C + C / 2;
            const x2 = MARGIN + b.c * C + C / 2;
            const y2 = MARGIN + b.r * C + C / 2;

            const bothDots = this.isDot(a.r, a.c) && this.isDot(b.r, b.c);
            const color = bothDots ? '#7c3aed' : '#2563eb';

            const line = svgEl('line', {
                x1, y1, x2, y2,
                stroke: color, 'stroke-width': lw,
                'stroke-linecap': 'round'
            });
            this.svgEl.insertBefore(line, this.svgEl.querySelector('.overlay-group'));
            this.pathLineEls.push(line);

            // クリック用ヒットエリア
            const hit = svgEl('line', {
                x1, y1, x2, y2,
                stroke: 'transparent', 'stroke-width': 18,
                'stroke-linecap': 'round',
                style: bothDots ? 'cursor: pointer;' : 'cursor: default;'
            });
            const si = i;
            hit.addEventListener('click', e => { e.stopPropagation(); this.clickSegment(si); });
            this.svgEl.insertBefore(hit, this.svgEl.querySelector('.overlay-group'));
            this.pathLineEls.push(hit);
        }

        // ループ完成時の閉じる線
        if (this.solved && this.path.length > 1) {
            const a = this.path[this.path.length - 1];
            const b = this.path[0];
            const line = svgEl('line', {
                x1: MARGIN + a.c * C + C / 2, y1: MARGIN + a.r * C + C / 2,
                x2: MARGIN + b.c * C + C / 2, y2: MARGIN + b.r * C + C / 2,
                stroke: '#16a34a', 'stroke-width': lw, 'stroke-linecap': 'round'
            });
            this.svgEl.insertBefore(line, this.svgEl.querySelector('.overlay-group'));
            this.pathLineEls.push(line);
        }

        // 始点ドット
        if (this.path.length > 0) {
            const s = this.path[0];
            const dot = svgEl('circle', {
                cx: MARGIN + s.c * C + C / 2,
                cy: MARGIN + s.r * C + C / 2,
                r: C >= 40 ? 7 : 5,
                fill: '#2563eb'
            });
            this.svgEl.insertBefore(dot, this.svgEl.querySelector('.overlay-group'));
            this.pathLineEls.push(dot);
        }
    }

    showSolved() {
        const overlay = this.container.querySelector('.solved-overlay');
        if (overlay) overlay.classList.remove('hidden');
        showToast();
        for (const key of Object.keys(this.cellEls))
            this.cellEls[key].setAttribute('fill', '#bbf7d0');
    }

    reset() {
        this.path = [];
        this.pathSet = new Set();
        this.drawing = false;
        this.solved = false;
        for (const el of this.pathLineEls) el.remove();
        this.pathLineEls = [];
        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++)
                if (this.puzzle.grid[r][c] && this.cellEls[this.cellKey(r, c)])
                    this.cellEls[this.cellKey(r, c)].setAttribute('fill', '#f0f4ff');
        const overlay = this.container.querySelector('.solved-overlay');
        if (overlay) overlay.classList.add('hidden');
    }

    // ---- SVGを構築 ----
    build() {
        const C = this.CELL;
        const W = this.cols * C + MARGIN * 2;
        const H = this.rows * C + MARGIN * 2;
        const svg = svgEl('svg', {
            width: W, height: H, viewBox: `0 0 ${W} ${H}`,
            style: 'touch-action: none; user-select: none; display: block;'
        });
        this.svgEl = svg;

        // セル背景
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.puzzle.grid[r][c]) continue;
                const rect = svgEl('rect', {
                    x: MARGIN + c * C, y: MARGIN + r * C,
                    width: C, height: C,
                    fill: '#f0f4ff',
                    rx: C >= 40 ? '4' : '2',
                    stroke: '#a5b4fc',
                    'stroke-width': C >= 40 ? '1.5' : '0.8'
                });
                this.cellEls[this.cellKey(r, c)] = rect;
                svg.appendChild(rect);
            }
        }

        // ドット（○）
        const overlayGroup = svgEl('g', { class: 'overlay-group' });
        for (const d of this.puzzle.dots) {
            const cx = MARGIN + d.c * C + C / 2;
            const cy = MARGIN + d.r * C + C / 2;
            overlayGroup.appendChild(svgEl('circle', { cx, cy, r: 10, fill: 'white', stroke: '#1e3a8a', 'stroke-width': '2.5' }));
            overlayGroup.appendChild(svgEl('circle', { cx, cy, r: 4, fill: '#1e3a8a' }));
        }
        svg.appendChild(overlayGroup);

        // マウスイベント
        const getCell = (x, y) => {
            const rect = svg.getBoundingClientRect();
            return {
                r: Math.floor((y - rect.top - MARGIN) / C),
                c: Math.floor((x - rect.left - MARGIN) / C)
            };
        };

        svg.addEventListener('mousedown', e => { const { r, c } = getCell(e.clientX, e.clientY); this.startPath(r, c); });
        svg.addEventListener('mousemove', e => { if (!this.drawing) return; const { r, c } = getCell(e.clientX, e.clientY); this.extendPath(r, c); });
        svg.addEventListener('mouseup', () => this.endPath());
        svg.addEventListener('mouseleave', () => { if (this.drawing) this.endPath(); });

        // タッチイベント
        svg.addEventListener('touchstart', e => { e.preventDefault(); const t = e.touches[0]; const { r, c } = getCell(t.clientX, t.clientY); this.startPath(r, c); }, { passive: false });
        svg.addEventListener('touchmove', e => { e.preventDefault(); if (!this.drawing) return; const t = e.touches[0]; const { r, c } = getCell(t.clientX, t.clientY); this.extendPath(r, c); }, { passive: false });
        svg.addEventListener('touchend', () => this.endPath());

        this.container.querySelector('.svg-wrap').appendChild(svg);
    }
}

// ================== Toast ==================
function showToast() {
    const t = document.getElementById('toast');
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 2500);
}

// ================== レンダリング ==================
function renderAll() {
    const root = document.getElementById('sets-container');

    // --- 通常パズルセット ---
    for (const set of PUZZLE_SETS) {
        const setDiv = document.createElement('div');
        setDiv.innerHTML = `
      <h2 class="caveat text-3xl font-bold mb-5 text-blue-600">${set.name}</h2>
      <div class="puzzles-row flex flex-wrap gap-6"></div>
    `;
        const row = setDiv.querySelector('.puzzles-row');

        for (const puzzle of set.puzzles) {
            const card = document.createElement('div');
            card.className = 'puzzle-card bg-white rounded-xl shadow-md p-4 relative select-none';
            card.innerHTML = `
        <div class="svg-wrap mb-2"></div>
        <div class="solved-overlay hidden absolute inset-0 bg-green-400/20 rounded-xl flex items-center justify-center pointer-events-none">
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

    // --- 25×45 フリープレイ ---
    const freeSection = document.createElement('div');
    freeSection.innerHTML = `
    <h2 class="caveat text-3xl font-bold mb-2 text-purple-600">🎨 Free Play（25×45）</h2>
    <p class="caveat text-gray-500 mb-4 text-base">好きなループを描こう！始めたセルに戻って手を離すと完成！</p>
  `;
    const freeCard = document.createElement('div');
    freeCard.className = 'bg-white rounded-xl shadow-md p-4 relative select-none overflow-auto';
    freeCard.innerHTML = `
    <div class="svg-wrap mb-2"></div>
    <div class="solved-overlay hidden absolute inset-0 bg-green-400/20 rounded-xl flex items-center justify-center pointer-events-none">
      <span class="caveat text-4xl font-bold text-green-700">✓ Loop Complete!</span>
    </div>
    <div class="flex items-center justify-between mt-2">
      <span class="caveat text-sm text-gray-400">Free Play</span>
      <button class="reset-btn caveat text-sm text-gray-400 hover:text-gray-700 border border-gray-300 rounded px-3 py-1 transition">リセット</button>
    </div>
  `;
    freeSection.appendChild(freeCard);
    root.appendChild(freeSection);

    const freeState = new PuzzleState(FREE_PLAY_PUZZLE, freeCard);
    freeCard.querySelector('.reset-btn').addEventListener('click', () => freeState.reset());
}

document.addEventListener('DOMContentLoaded', renderAll);
