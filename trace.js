// ================== トレースモード ==================
// loop.png背景の上に透過青線でフリードロー
function initTraceMode() {
    const img = document.getElementById('trace-bg');
    const canvas = document.getElementById('trace-canvas');
    const clearBtn = document.getElementById('trace-clear');
    if (!img || !canvas) return;

    const ctx = canvas.getContext('2d');
    let drawing = false;

    // Canvas解像度を画像に合わせて設定
    function resizeCanvas() {
        const rect = img.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        const scale = canvas.width / rect.width;
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        applyStyle();
    }

    function applyStyle() {
        ctx.strokeStyle = 'rgba(30, 100, 255, 0.5)'; // 透過50%の青
        ctx.lineWidth = 8;   // 太め
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }

    if (img.complete && img.naturalWidth > 0) {
        resizeCanvas();
    } else {
        img.addEventListener('load', resizeCanvas);
    }
    window.addEventListener('resize', resizeCanvas);

    // マウス/タッチ座標をCanvas相対に変換
    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const src = e.touches ? e.touches[0] : e;
        return { x: src.clientX - rect.left, y: src.clientY - rect.top };
    }

    function startDraw(e) {
        e.preventDefault();
        drawing = true;
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

    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width / (window.devicePixelRatio || 1),
            canvas.height / (window.devicePixelRatio || 1));
    }

    // マウスイベント
    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);

    // タッチイベント
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);

    // 右クリックでクリア
    canvas.addEventListener('contextmenu', e => { e.preventDefault(); clearCanvas(); });

    // クリアボタン
    if (clearBtn) clearBtn.addEventListener('click', clearCanvas);
}

document.addEventListener('DOMContentLoaded', initTraceMode);
