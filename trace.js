// ================== トレースモード ==================
// loop.png背景の上にフリードロー
// モード: 描く / 消しゴム
// 機能: 一つ戻る / 全消し
function initTraceMode() {
    const img = document.getElementById('trace-bg');
    const canvas = document.getElementById('trace-canvas');
    const btnDraw = document.getElementById('trace-mode-draw');
    const btnErase = document.getElementById('trace-mode-erase');
    const btnUndo = document.getElementById('trace-undo');
    const btnClear = document.getElementById('trace-clear');
    if (!img || !canvas) return;

    const ctx = canvas.getContext('2d');
    let mode = 'draw';   // 'draw' | 'erase'
    let drawing = false;
    let history = [];       // アンドゥ用 ImageData スタック

    // ---- Canvas解像度を画像サイズに合わせる ----
    function resizeCanvas() {
        const rect = img.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        // 現在の描画を保持して復元
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
            ctx.lineWidth = 24; // 消しゴムは太め
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }

    if (img.complete && img.naturalWidth > 0) { resizeCanvas(); }
    else { img.addEventListener('load', resizeCanvas); }
    window.addEventListener('resize', resizeCanvas);

    // ---- アンドゥ履歴を保存 ----
    function saveHistory() {
        const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
        history.push(snap);
        if (history.length > 30) history.shift(); // 最大30ステップ
    }

    // ---- 座標取得 ----
    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const src = e.touches ? e.touches[0] : e;
        return { x: src.clientX - rect.left, y: src.clientY - rect.top };
    }

    // ---- 描画イベント ----
    function startDraw(e) {
        if (e.button !== undefined && e.button !== 0) return; // 左クリックのみ
        e.preventDefault();
        saveHistory(); // ストローク開始前に保存
        drawing = true;
        applyStyle();
        const { x, y } = getPos(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    function draw(e) {
        if (!drawing) return;
        e.preventDefault();
        const { x, y } = getPos(e);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    function stopDraw() {
        drawing = false;
        ctx.beginPath();
    }

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // ---- カーソルをモードに応じて変更 ----
    function updateCursor() {
        canvas.style.cursor = mode === 'erase' ? 'cell' : 'crosshair';
    }

    // ---- モード切替ボタン ----
    function setMode(m) {
        mode = m;
        updateCursor();
        if (m === 'draw') {
            btnDraw.classList.replace('bg-white', 'bg-blue-500');
            btnDraw.classList.replace('text-gray-500', 'text-white');
            btnDraw.classList.replace('border-gray-300', 'border-blue-500');
            btnErase.classList.replace('bg-blue-500', 'bg-white');
            btnErase.classList.replace('text-white', 'text-gray-500');
            btnErase.classList.replace('border-blue-500', 'border-gray-300');
        } else {
            btnErase.classList.replace('bg-white', 'bg-blue-500');
            btnErase.classList.replace('text-gray-500', 'text-white');
            btnErase.classList.replace('border-gray-300', 'border-blue-500');
            btnDraw.classList.replace('bg-blue-500', 'bg-white');
            btnDraw.classList.replace('text-white', 'text-gray-500');
            btnDraw.classList.replace('border-blue-500', 'border-gray-300');
        }
    }

    if (btnDraw) btnDraw.addEventListener('click', () => setMode('draw'));
    if (btnErase) btnErase.addEventListener('click', () => setMode('erase'));

    // ---- 一つ戻る ----
    if (btnUndo) {
        btnUndo.addEventListener('click', () => {
            if (history.length === 0) return;
            const snap = history.pop();
            ctx.putImageData(snap, 0, 0);
        });
    }

    // ---- 全消し ----
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            saveHistory();
            ctx.clearRect(0, 0, canvas.width / (window.devicePixelRatio || 1),
                canvas.height / (window.devicePixelRatio || 1));
        });
    }
}

document.addEventListener('DOMContentLoaded', initTraceMode);
