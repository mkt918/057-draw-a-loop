// Draw a Loop! - ゲームロジック（セル移動方式）
// セルをクリック/ドラッグして一筆書きのループを描く

const CELL = 52;
const MARGIN = 16;
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
        this.path = [];          // セルのインデックス順リスト [{r,c}, ...]
        this.pathSet = new Set(); // 通過済みセルの "r,c" セット
        this.drawing = false;    // ドラッグ中か
        this.solved = false;
        this.container = container;
        this.cellEls = {};       // "r,c" -> rect SVG要素
        this.pathLineEls = [];   // path line SVGリスト
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

    // ---- セグメントをクリックでキャンセル ----
    // segIdx = path[segIdx] → path[segIdx+1] のセグメント
    clickSegment(segIdx) {
        if (this.solved) return;
        const a = this.path[segIdx];
        const b = this.path[segIdx + 1];
        if (!a || !b) return;
        // 両端が○セルの場合のみキャンセル可能
        if (this.isDot(a.r, a.c) && this.isDot(b.r, b.c)) {
            // path[0]〜path[segIdx] までに切り詰める
            const removed = this.path.splice(segIdx + 1);
            for (const cell of removed) this.pathSet.delete(this.cellKey(cell.r, cell.c));
            this.drawing = false;
            this.redrawPath();
        }
        // 両端が○でない場合は何もしない
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

        // 直前のセルを戻るならアンドゥ
        if (this.path.length >= 2) {
            const prev = this.path[this.path.length - 2];
            if (prev.r === r && prev.c === c) {
                this.pathSet.delete(this.cellKey(last.r, last.c));
                this.path.pop();
                this.redrawPath();
                return;
            }
        }

        // 既に通ったセルはスキップ（ループ完成チェック以外）
        if (this.pathSet.has(key)) return;

        // 隣接チェック
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

        // 最後と最初が隣接 && 全セルを通った場合にループ完成
        if (this.isAdjacent(first, last) && this.path.length === this.totalCells()) {
            this.solved = true;
            this.showSolved();
        }
        // 完成していない場合もパスは表示したままにする（ユーザーが確認できるよう）
    }

    // ---- パスの再描画 ----
    redrawPath() {
        // 既存のpath lineを全削除
        for (const el of this.pathLineEls) el.remove();
        this.pathLineEls = [];

        // セル色を更新
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.puzzle.grid[r][c]) continue;
                const el = this.cellEls[this.cellKey(r, c)];
                if (!el) continue;
                const inPath = this.pathSet.has(this.cellKey(r, c));
                el.setAttribute('fill', inPath ? '#dbeafe' : '#f0f4ff');
            }
        }

        // パスの線を描画（セル中心を結ぶ）
        for (let i = 0; i < this.path.length - 1; i++) {
            const a = this.path[i];
            const b = this.path[i + 1];
            const x1 = MARGIN + a.c * CELL + CELL / 2;
            const y1 = MARGIN + a.r * CELL + CELL / 2;
            const x2 = MARGIN + b.c * CELL + CELL / 2;
            const y2 = MARGIN + b.r * CELL + CELL / 2;

            // 両端が○かどうかで色を変える
            const bothDots = this.isDot(a.r, a.c) && this.isDot(b.r, b.c);
            const strokeColor = bothDots ? '#7c3aed' : '#2563eb'; // 紫=キャンセル可, 青=通常

            const line = svgEl('line', {
                x1, y1, x2, y2,
                stroke: strokeColor, 'stroke-width': '6',
                'stroke-linecap': 'round'
            });
            this.svgEl.insertBefore(line, this.svgEl.querySelector('.overlay-group'));
            this.pathLineEls.push(line);

            // クリック用透明ヒットエリア（太め）
            const hit = svgEl('line', {
                x1, y1, x2, y2,
                stroke: 'transparent', 'stroke-width': '18',
                'stroke-linecap': 'round',
                style: bothDots ? 'cursor: pointer;' : 'cursor: default;'
            });
            const segIdx = i;
            hit.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clickSegment(segIdx);
            });
            this.svgEl.insertBefore(hit, this.svgEl.querySelector('.overlay-group'));
            this.pathLineEls.push(hit);
        }

        // ループ完成時の閉じる線（最後→最初）
        if (this.solved && this.path.length > 1) {
            const a = this.path[this.path.length - 1];
            const b = this.path[0];
            const x1 = MARGIN + a.c * CELL + CELL / 2;
            const y1 = MARGIN + a.r * CELL + CELL / 2;
            const x2 = MARGIN + b.c * CELL + CELL / 2;
            const y2 = MARGIN + b.r * CELL + CELL / 2;
            const line = svgEl('line', {
                x1, y1, x2, y2,
                stroke: '#16a34a', 'stroke-width': '6',
                'stroke-linecap': 'round'
            });
            this.svgEl.insertBefore(line, this.svgEl.querySelector('.overlay-group'));
            this.pathLineEls.push(line);
        }

        // 始点と終点にドットを表示
        if (this.path.length > 0) {
            const start = this.path[0];
            const cx = MARGIN + start.c * CELL + CELL / 2;
            const cy = MARGIN + start.r * CELL + CELL / 2;
            const dot = svgEl('circle', { cx, cy, r: 7, fill: '#2563eb' });
            this.svgEl.insertBefore(dot, this.svgEl.querySelector('.overlay-group'));
            this.pathLineEls.push(dot);
        }
    }

    showSolved() {
        const overlay = this.container.querySelector('.solved-overlay');
        if (overlay) overlay.classList.remove('hidden');
        showToast();
        // 全セルを緑色に
        for (const key of Object.keys(this.cellEls)) {
            this.cellEls[key].setAttribute('fill', '#bbf7d0');
        }
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
        const W = this.cols * CELL + MARGIN * 2;
        const H = this.rows * CELL + MARGIN * 2;
        const svg = svgEl('svg', {
            width: W, height: H, viewBox: `0 0 ${W} ${H}`,
            style: 'touch-action: none; user-select: none;'
        });
        this.svgEl = svg;

        // ---- セル背景 ----
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.puzzle.grid[r][c]) continue;
                const rect = svgEl('rect', {
                    x: MARGIN + c * CELL, y: MARGIN + r * CELL,
                    width: CELL, height: CELL,
                    fill: '#f0f4ff', rx: '4',
                    stroke: '#a5b4fc', 'stroke-width': '1.5'
                });
                this.cellEls[this.cellKey(r, c)] = rect;
                svg.appendChild(rect);
            }
        }

        // ---- ドット（○）表示 ----
        const overlayGroup = svgEl('g', { class: 'overlay-group' });
        for (const d of this.puzzle.dots) {
            const cx = MARGIN + d.c * CELL + CELL / 2;
            const cy = MARGIN + d.r * CELL + CELL / 2;
            overlayGroup.appendChild(svgEl('circle', {
                cx, cy, r: 10, fill: 'white', stroke: '#1e3a8a', 'stroke-width': '2.5'
            }));
            overlayGroup.appendChild(svgEl('circle', {
                cx, cy, r: 4, fill: '#1e3a8a'
            }));
        }
        svg.appendChild(overlayGroup);

        // ---- セル番号（デバッグ用・非表示）----

        // ---- イベント: マウス/タッチ ----
        const getCell = (x, y) => {
            const rect = svg.getBoundingClientRect();
            const px = x - rect.left;
            const py = y - rect.top;
            const c = Math.floor((px - MARGIN) / CELL);
            const r = Math.floor((py - MARGIN) / CELL);
            return { r, c };
        };

        // マウス
        svg.addEventListener('mousedown', e => {
            const { r, c } = getCell(e.clientX, e.clientY);
            this.startPath(r, c);
        });
        svg.addEventListener('mousemove', e => {
            if (!this.drawing) return;
            const { r, c } = getCell(e.clientX, e.clientY);
            this.extendPath(r, c);
        });
        svg.addEventListener('mouseup', () => this.endPath());
        svg.addEventListener('mouseleave', () => { if (this.drawing) this.endPath(); });

        // タッチ
        svg.addEventListener('touchstart', e => {
            e.preventDefault();
            const t = e.touches[0];
            const { r, c } = getCell(t.clientX, t.clientY);
            this.startPath(r, c);
        }, { passive: false });
        svg.addEventListener('touchmove', e => {
            e.preventDefault();
            if (!this.drawing) return;
            const t = e.touches[0];
            const { r, c } = getCell(t.clientX, t.clientY);
            this.extendPath(r, c);
        }, { passive: false });
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
}

document.addEventListener('DOMContentLoaded', renderAll);
