// Draw a Loop! - パズルデータ定義
// grid: 2D配列 (1=有効セル, 0=空白)
// dots: ループで囲む必要がある○の位置 [{r, c}]

const PUZZLE_SETS = [
  {
    id: 1, name: 'Set 1', color: '#2563eb',
    puzzles: [
      {
        id: '1-1',
        grid: [
          [1, 1],
          [1, 1],
          [0, 1],
        ],
        dots: [{ r: 0, c: 0 }, { r: 2, c: 1 }]
      },
      {
        id: '1-2',
        grid: [
          [0, 1, 1],
          [1, 1, 0],
          [0, 1, 0],
        ],
        dots: [{ r: 0, c: 2 }, { r: 2, c: 1 }]
      },
      {
        id: '1-3',
        grid: [
          [0, 1, 0],
          [1, 1, 1],
          [0, 1, 0],
          [0, 1, 0],
        ],
        dots: [{ r: 0, c: 1 }, { r: 2, c: 0 }, { r: 3, c: 1 }]
      },
      {
        id: '1-4',
        grid: [
          [1, 1, 0, 0],
          [1, 1, 1, 0],
          [0, 1, 1, 1],
          [0, 0, 1, 0],
        ],
        dots: [{ r: 0, c: 0 }, { r: 1, c: 2 }, { r: 3, c: 2 }]
      },
      {
        id: '1-5',
        grid: [
          [1, 1, 0, 1],
          [1, 0, 1, 1],
          [1, 1, 1, 0],
        ],
        dots: [{ r: 0, c: 0 }, { r: 0, c: 3 }, { r: 2, c: 0 }]
      },
    ]
  },
  {
    id: 2, name: 'Set 2', color: '#2563eb',
    puzzles: [
      {
        id: '2-1',
        grid: [
          [0, 1],
          [0, 1],
        ],
        dots: [{ r: 0, c: 1 }, { r: 1, c: 1 }]
      },
      {
        id: '2-2',
        grid: [
          [0, 1, 1],
          [1, 1, 0],
          [1, 0, 0],
        ],
        dots: [{ r: 0, c: 2 }, { r: 1, c: 0 }]
      },
      {
        id: '2-3',
        grid: [
          [1, 0],
          [1, 1],
          [1, 0],
        ],
        dots: [{ r: 0, c: 0 }, { r: 2, c: 0 }]
      },
      {
        id: '2-4',
        grid: [
          [1, 1, 0],
          [1, 1, 1],
          [0, 1, 1],
        ],
        dots: [{ r: 0, c: 0 }, { r: 1, c: 1 }, { r: 2, c: 2 }]
      },
      {
        id: '2-5',
        grid: [
          [1, 0, 1],
          [1, 1, 1],
        ],
        dots: [{ r: 0, c: 0 }, { r: 0, c: 2 }]
      },
    ]
  },
  {
    id: 3, name: 'Set 3', color: '#2563eb',
    puzzles: [
      {
        id: '3-1',
        grid: [
          [0, 1, 0],
          [1, 1, 1],
          [0, 1, 0],
        ],
        dots: [{ r: 1, c: 1 }]
      },
      {
        id: '3-2',
        grid: [
          [1, 1],
          [1, 1],
        ],
        dots: [{ r: 0, c: 0 }, { r: 1, c: 1 }]
      },
      {
        id: '3-3',
        grid: [
          [1, 1],
          [1, 1],
        ],
        dots: [{ r: 1, c: 1 }]
      },
      {
        id: '3-4',
        grid: [
          [1, 1],
          [1, 1],
        ],
        dots: []
      },
      {
        id: '3-5',
        grid: [
          [1],
        ],
        dots: []
      },
    ]
  },
];

// ---- 25×45 フリープレイグリッド ----
// freePlay: true のとき「全セル通過不要・閉じたループだけで正解」
const FREE_ROWS = 25;
const FREE_COLS = 45;
const FREE_PLAY_PUZZLE = {
  id: 'free',
  freePlay: true,
  grid: Array.from({ length: FREE_ROWS }, () => Array(FREE_COLS).fill(1)),
  dots: [],
};
