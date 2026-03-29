// --- Représentation ---
// Majuscules = Blancs, minuscules = Noirs
// P/p = pion
// K/k = roi
// Q/R/B/N = dame, tour, fou, cavalier

let board = [];
let selected = null;
let possibleMoves = [];
let whiteToMove = true;
let gameOver = false;

// Roque
let castlingRights = {
  whiteKingMoved: false,
  whiteRookA: false,
  whiteRookH: false,
  blackKingMoved: false,
  blackRookA: false,
  blackRookH: false
};

let scoreWhite = 0;
let scoreBlack = 0;

// DOM
const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const turnEl = document.getElementById("turn-indicator");
const scoreWhiteEl = document.getElementById("score-white");
const scoreBlackEl = document.getElementById("score-black");
const aiLevelSelect = document.getElementById("ai-level");
const newGameBtn = document.getElementById("new-game");

// --- Mapping images ---
function pieceToImage(p, row, col) {
  const isWhite = p === p.toUpperCase();
  const type = p.toUpperCase();

  if (type === "P") return isWhite ? "img/pion_blanc.png" : "img/pion_noir.png";
  if (type === "R") return isWhite ? "img/tour_blanc.png" : "img/tour_noir.png";
  if (type === "B") return isWhite ? "img/fou_blanc.png" : "img/fou_noir.png";
  if (type === "Q") return isWhite ? "img/dame_blanc.png" : "img/dame_noir.png";
  if (type === "K") return isWhite ? "img/roi_blanc.png" : "img/roi_noir.png";

  // Cavaliers gauche/droite selon colonne
  if (type === "N") {
    const isLeft = col < 4;
    if (isWhite) return isLeft ? "img/cavalier_blanc_gauche.png" : "img/cavalier_blanc_droite.png";
    return isLeft ? "img/cavalier_noir_gauche.png" : "img/cavalier_noir_droite.png";
  }

  return "";
}

// --- Initialisation ---
function initBoard() {
  board = [
    ["r", "n", "b", "q", "k", "b", "n", "r"],
    ["p", "p", "p", "p", "p", "p", "p", "p"],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["P", "P", "P", "P", "P", "P", "P", "P"],
    ["R", "N", "B", "Q", "K", "B", "N", "R"]
  ];

  whiteToMove = true;
  selected = null;
  possibleMoves = [];
  gameOver = false;

  castlingRights = {
    whiteKingMoved: false,
    whiteRookA: false,
    whiteRookH: false,
    blackKingMoved: false,
    blackRookA: false,
    blackRookH: false
  };

  renderBoard();
  updateStatus("À toi de jouer (Blancs).");
  updateTurnIndicator();
}

function createBoardUI() {
  boardEl.innerHTML = "";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement("div");
      sq.classList.add("square");
      sq.classList.add((r + c) % 2 === 1 ? "dark" : "light");
      sq.dataset.row = r;
      sq.dataset.col = c;
      sq.addEventListener("click", onSquareClick);
      boardEl.appendChild(sq);
    }
  }
}

// --- Rendu du plateau avec images PNG ---
function renderBoard() {
  const squares = boardEl.querySelectorAll(".square");

  squares.forEach((sq) => {
    const r = parseInt(sq.dataset.row, 10);
    const c = parseInt(sq.dataset.col, 10);
    const piece = board[r][c];

    sq.innerHTML = "";
    sq.classList.remove("selected", "move-target", "check");

    if (piece) {
      const img = document.createElement("img");
      img.src = pieceToImage(piece, r, c);
      img.classList.add("piece-img");
      sq.appendChild(img);
    }
  });

  possibleMoves.forEach((m) => {
    const idx = m.toRow * 8 + m.toCol;
    squares[idx].classList.add("move-target");
  });

  const kingPos = findKing(whiteToMove ? "white" : "black");
  if (kingPos && isSquareAttacked(kingPos.row, kingPos.col, whiteToMove ? "black" : "white")) {
    const idx = kingPos.row * 8 + kingPos.col;
    squares[idx].classList.add("check");
  }
}

// --- Clics ---
function onSquareClick(e) {
  if (gameOver) return;

  const row = parseInt(e.currentTarget.dataset.row, 10);
  const col = parseInt(e.currentTarget.dataset.col, 10);
  const piece = board[row][col];
  const playerColor = whiteToMove ? "white" : "black";

  const move = possibleMoves.find(m => m.toRow === row && m.toCol === col);

  if (selected && move) {
    makeMove(move);
    renderBoard();
    checkGameState();
    if (!gameOver) setTimeout(aiMove, 200);
    return;
  }

  if (!pieceBelongsToColor(piece, playerColor)) {
    selected = null;
    possibleMoves = [];
    renderBoard();
    return;
  }

  selected = { row, col };
  possibleMoves = generateLegalMovesForSquare(row, col, playerColor);
  renderBoard();
  highlightSelected(row, col);
}

function highlightSelected(row, col) {
  const idx = row * 8 + col;
  const squares = boardEl.querySelectorAll(".square");
  squares[idx].classList.add("selected");
}

// --- Utilitaires ---
function pieceBelongsToColor(piece, color) {
  if (!piece) return false;
  const isWhite = piece === piece.toUpperCase();
  return color === "white" ? isWhite : !isWhite;
}

function oppositeColor(color) {
  return color === "white" ? "black" : "white";
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

// --- Génération des coups ---
/* (SECTION IDENTIQUE À TON CODE — JE LA GARDE INTACTE) */
/* Je ne la réécris pas ici pour éviter un message trop long,
   mais je peux te la remettre complète si tu veux. */

// --- IA, évaluation, negamax, roque, etc. ---
/* (SECTION IDENTIQUE À TON CODE — inchangée) */

// --- Scores ---
function updateScores() {
  scoreWhiteEl.textContent = scoreWhite;
  scoreBlackEl.textContent = scoreBlack;
}

function updateStatus(msg) {
  statusEl.textContent = msg;
}

function updateTurnIndicator() {
  turnEl.textContent = whiteToMove ? "Tour : Blancs" : "Tour : Noirs (IA)";
}

// --- Événements ---
newGameBtn.addEventListener("click", () => {
  scoreWhite = 0;
  scoreBlack = 0;
  updateScores();
  initBoard();
});

createBoardUI();
initBoard();
updateScores();
