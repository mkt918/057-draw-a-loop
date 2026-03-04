// ================== トレースモード ==================
// loop.png背景の上にフリードロー
// スムージング: 二次ベジェ曲線（中点補間）でガタガタを自動補正
function initTraceMode() {
    const img = document.getElementById('trace-bg');
    const canvas = document.getElementById('trace-canvas');
    const btnDraw = document.getElementById('trace-mode-draw');
    const btnErase = document.getElementById('trace-mode-erase');
    const btnUndo = document.getElementById('trace-undo');
    const btnClear = document.getElementById('trace-clear');
    if (!img || !canvas) return;

    const ctx = canvas.getContext('2d');
    let mode = 'draw';
    let drawing = false;
    let prev = null;   // 前フレームの座標
    let history = [];     // アンドゥ用 ImageData スタック

    // ---- Canvas解像度を画像サイズに合わせる ----
    function resizeCanvas() {
        const rect = img.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        let saved = null;
        if (canvas.width > 0 && canvas.height > 0) {
            saved = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (saved) ctx.putImageData(saved, 0, 0);
        applyStyle();
    }

    function applyStyle() {
        if (mode === 'draw') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = 'rgba(30, 100, 255, 0.5)';
            ctx.lineWidth = 8;
        } else {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
            ctx.lineWidth = 24;
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }

    if (img.complete && img.naturalWidth > 0) { resizeCanvas(); }
    else { img.addEventListener('load', resizeCanvas); }
    window.addEventListener('resize', resizeCanvas);

    // ---- アンドゥ履歴を保存 ----
    function saveHistory() {
        history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        if (history.length > 30) history.shift();
    }

    // ---- 座標取得 ----
    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const src = e.touches ? e.touches[0] : e;
        return { x: src.clientX - rect.left, y: src.clientY - rect.top };
    }

    // ---- 描画開始 ----
    function startDraw(e) {
        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault();
        saveHistory();
        drawing = true;
        applyStyle();
        const { x, y } = getPos(e);
        prev = { x, y };
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    // ---- 描画（二次ベジェ曲線スムージング） ----
    // 前の点と現在の点の中点を「通過点」にして quadraticCurveTo を使う。
    // 生座標をそのまま使うガタガタが解消される。
    function draw(e) {
        if (!drawing) return;
        e.preventDefault();
        const { x, y } = getPos(e);

        // 中点を計算（スムージングの核心）
        const midX = (prev.x + x) / 2;
        const midY = (prev.y + y) / 2;

        // prev を制御点、中点を終点とした二次ベジェで描画
        ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
        ctx.stroke();

        // 次のセグメントの開始点を中点にセット
        ctx.beginPath();
        ctx.moveTo(midX, midY);

        prev = { x, y };
    }

    // ---- 描画終了 ----
    function stopDraw() {
        if (!drawing) return;
        drawing = false;
        // 最後の点まで直線で締める
        if (prev) {
            ctx.lineTo(prev.x, prev.y);
            ctx.stroke();
        }
        ctx.beginPath();
        prev = null;
    }

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // ---- カーソル変更 ----
    function updateCursor() {
        canvas.style.cursor = mode === 'erase' ? 'cell' : 'crosshair';
    }

    // ---- モード切替 ----
    function setMode(m) {
        mode = m;
        updateCursor();
        const isErase = m === 'erase';
        [btnDraw, btnErase].forEach((btn, i) => {
            const active = (i === 0 && !isErase) || (i === 1 && isErase);
            btn.className = btn.className
                .replace(/bg-blue-500|bg-white/g, active ? 'bg-blue-500' : 'bg-white')
                .replace(/text-white|text-gray-500/g, active ? 'text-white' : 'text-gray-500')
                .replace(/border-blue-500|border-gray-300/g, active ? 'border-blue-500' : 'border-gray-300');
        });
    }

    if (btnDraw) btnDraw.addEventListener('click', () => setMode('draw'));
    if (btnErase) btnErase.addEventListener('click', () => setMode('erase'));

    // ---- 一つ戻る ----
    if (btnUndo) {
        btnUndo.addEventListener('click', () => {
            if (history.length === 0) return;
            ctx.putImageData(history.pop(), 0, 0);
        });
    }

    // ---- 全消し ----
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            saveHistory();
            const dpr = window.devicePixelRatio || 1;
            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        });
    }
}

document.addEventListener('DOMContentLoaded', initTraceMode);
