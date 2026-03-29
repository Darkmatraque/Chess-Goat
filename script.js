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

// Roque : état
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
      const dark = (r + c) % 2 === 1;
      sq.classList.add(dark ? "dark" : "light");
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

  const move = possibleMoves.find(
    (m) => m.toRow === row && m.toCol === col
  );
  if (selected && move) {
    makeMove(move);
    renderBoard();
    checkGameState();
    if (!gameOver) {
      setTimeout(aiMove, 200);
    }
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

// --- Couleurs / utilitaires ---
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

// --- Génération de coups ---
function generateLegalMovesForSquare(row, col, color) {
  const piece = board[row][col];
  if (!piece || !pieceBelongsToColor(piece, color)) return [];
  const pseudo = generatePseudoLegalMovesForSquare(row, col, color);
  const legal = [];
  for (const m of pseudo) {
    const backup = {
      board: cloneBoard(board),
      castling: { ...castlingRights },
      whiteToMove
    };
    applyMoveWithCastling(board, m);
    const kingPos = findKing(color);
    const inCheck = kingPos && isSquareAttacked(kingPos.row, kingPos.col, oppositeColor(color));
    restoreState(backup);
    if (!inCheck) legal.push(m);
  }
  return legal;
}

function generatePseudoLegalMovesForSquare(row, col, color) {
  const moves = [];
  const piece = board[row][col];
  if (!piece) return moves;
  const isWhite = color === "white";
  const type = piece.toUpperCase();

  const dirPawn = isWhite ? -1 : 1;
  const startRow = isWhite ? 6 : 1;

  if (type === "P") {
    const nr = row + dirPawn;
    if (inBounds(nr, col) && board[nr][col] === "") {
      addPawnMove(row, col, nr, col, color, moves);
      const nr2 = row + 2 * dirPawn;
      if (row === startRow && board[nr2][col] === "") {
        moves.push({ fromRow: row, fromCol: col, toRow: nr2, toCol: col });
      }
    }
    for (const dc of [-1, 1]) {
      const cr = row + dirPawn;
      const cc = col + dc;
      if (inBounds(cr, cc) && board[cr][cc] !== "" && !pieceBelongsToColor(board[cr][cc], color)) {
        addPawnMove(row, col, cr, cc, color, moves);
      }
    }
  } else if (type === "N") {
    const deltas = [
      [-2, -1], [-2, 1],
      [-1, -2], [-1, 2],
      [1, -2], [1, 2],
      [2, -1], [2, 1]
    ];
    for (const [dr, dc] of deltas) {
      const nr = row + dr;
      const nc = col + dc;
      if (!inBounds(nr, nc)) continue;
      if (board[nr][nc] === "" || !pieceBelongsToColor(board[nr][nc], color)) {
        moves.push({ fromRow: row, fromCol: col, toRow: nr, toCol: nc });
      }
    }
  } else if (type === "B" || type === "R" || type === "Q") {
    const dirs = [];
    if (type === "B" || type === "Q") {
      dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    }
    if (type === "R" || type === "Q") {
      dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
    }
    for (const [dr, dc] of dirs) {
      let nr = row + dr;
      let nc = col + dc;
      while (inBounds(nr, nc)) {
        if (board[nr][nc] === "") {
          moves.push({ fromRow: row, fromCol: col, toRow: nr, toCol: nc });
        } else {
          if (!pieceBelongsToColor(board[nr][nc], color)) {
            moves.push({ fromRow: row, fromCol: col, toRow: nr, toCol: nc });
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  } else if (type === "K") {
    const deltas = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    for (const [dr, dc] of deltas) {
      const nr = row + dr;
      const nc = col + dc;
      if (!inBounds(nr, nc)) continue;
      if (board[nr][nc] === "" || !pieceBelongsToColor(board[nr][nc], color)) {
        moves.push({ fromRow: row, fromCol: col, toRow: nr, toCol: nc });
      }
    }
    addCastlingMoves(row, col, color, moves);
  }

  return moves;
}

function addPawnMove(fr, fc, tr, tc, color, moves) {
  if ((color === "white" && tr === 0) || (color === "black" && tr === 7)) {
    moves.push({
      fromRow: fr,
      fromCol: fc,
      toRow: tr,
      toCol: tc,
      promotion: true
    });
  } else {
    moves.push({ fromRow: fr, fromCol: fc, toRow: tr, toCol: tc });
  }
}

function addCastlingMoves(row, col, color, moves) {
  const isWhite = color === "white";
  const kingMoved = isWhite ? castlingRights.whiteKingMoved : castlingRights.blackKingMoved;
  if (kingMoved) return;
  const backRank = isWhite ? 7 : 0;

  if (row !== backRank || col !== 4) return;

  const rookH = board[backRank][7];
  const rookHMoved = isWhite ? castlingRights.whiteRookH : castlingRights.blackRookH;
  if (rookH && rookH.toUpperCase() === "R" && !rookHMoved) {
    if (board[backRank][5] === "" && board[backRank][6] === "") {
      if (!isSquareAttacked(backRank, 4, oppositeColor(color)) &&
          !isSquareAttacked(backRank, 5, oppositeColor(color)) &&
          !isSquareAttacked(backRank, 6, oppositeColor(color))) {
        moves.push({
          fromRow: backRank,
          fromCol: 4,
          toRow: backRank,
          toCol: 6,
          castling: "king"
        });
      }
    }
  }

  const rookA = board[backRank][0];
  const rookAMoved = isWhite ? castlingRights.whiteRookA : castlingRights.blackRookA;
  if (rookA && rookA.toUpperCase() === "R" && !rookAMoved) {
    if (board[backRank][1] === "" && board[backRank][2] === "" && board[backRank][3] === "") {
      if (!isSquareAttacked(backRank, 4, oppositeColor(color)) &&
          !isSquareAttacked(backRank, 3, oppositeColor(color)) &&
          !isSquareAttacked(backRank, 2, oppositeColor(color))) {
        moves.push({
          fromRow: backRank,
          fromCol: 4,
          toRow: backRank,
          toCol: 2,
          castling: "queen"
        });
      }
    }
  }
}

// --- Application de coup + roque ---
function applyMoveWithCastling(b, move) {
  const piece = b[move.fromRow][move.fromCol];
  const isWhite = piece === piece.toUpperCase();
  const color = isWhite ? "white" : "black";

  if (move.castling === "king") {
    b[move.toRow][move.toCol] = piece;
    b[move.fromRow][move.fromCol] = "";
    b[move.toRow][5] = b[move.toRow][7];
    b[move.toRow][7] = "";
  } else if (move.castling === "queen") {
    b[move.toRow][move.toCol] = piece;
    b[move.fromRow][move.fromCol] = "";
    b[move.toRow][3] = b[move.toRow][0];
    b[move.toRow][0] = "";
  } else {
    let movedPiece = piece;
    if (move.promotion) {
      movedPiece = isWhite ? "Q" : "q";
    }
    b[move.toRow][move.toCol] = movedPiece;
    b[move.fromRow][move.fromCol] = "";
  }

  if (piece.toUpperCase() === "K") {
    if (color === "white") castlingRights.whiteKingMoved = true;
    else castlingRights.blackKingMoved = true;
  }
  if (piece.toUpperCase() === "R") {
    if (color === "white") {
      if (move.fromRow === 7 && move.fromCol === 0) castlingRights.whiteRookA = true;
      if (move.fromRow === 7 && move.fromCol === 7) castlingRights.whiteRookH = true;
    } else {
      if (move.fromRow === 0 && move.fromCol === 0) castlingRights.blackRookA = true;
      if (move.fromRow === 0 && move.fromCol === 7) castlingRights.blackRookH = true;
    }
  }
}

function makeMove(move) {
  const piece = board[move.fromRow][move.fromCol];
  const captured = board[move.toRow][move.toCol];

  applyMoveWithCastling(board, move);

  if (captured) {
    const val = pieceValue(captured);
    if (piece === piece.toUpperCase()) {
      scoreWhite += val;
    } else {
      scoreBlack += val;
    }
    updateScores();
  }

  whiteToMove = !whiteToMove;
  selected = null;
  possibleMoves = [];
  updateTurnIndicator();
}

// --- Score / affichage ---
function pieceValue(p) {
  const type = p.toUpperCase();
  if (type === "P") return 1;
  if (type === "N" || type === "B") return 3;
  if (type === "R") return 5;
  if (type === "Q") return 9;
  if (type === "K") return 100;
  return 0;
}

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

// --- Roi / échec / mat ---
function findKing(color) {
  const isWhite = color === "white";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      if (p.toUpperCase() === "K") {
        if (pieceBelongsToColor(p, color)) return { row: r, col: c };
      }
    }
  }
  return null;
}

function isSquareAttacked(row, col, byColor) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!pieceBelongsToColor(p, byColor)) continue;
      const pseudo = generatePseudoLegalMovesForSquare(r, c, byColor);
      if (pseudo.some((m) => m.toRow === row && m.toCol === col)) {
        return true;
      }
    }
  }
  return false;
}

function allLegalMoves(color) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (!pieceBelongsToColor(board[r][c], color)) continue;
      const ms = generateLegalMovesForSquare(r, c, color);
      moves.push(...ms);
    }
  }
  return moves;
}

function checkGameState() {
  const color = whiteToMove ? "white" : "black";
  const kingPos = findKing(color);
  const moves = allLegalMoves(color);
  const inCheck = kingPos && isSquareAttacked(kingPos.row, kingPos.col, oppositeColor(color));

  if (moves.length === 0) {
    gameOver = true;
    if (inCheck) {
      updateStatus(`Échec et mat ! ${whiteToMove ? "Noirs" : "Blancs"} gagnent.`);
    } else {
      updateStatus("Pat (match nul).");
    }
  } else if (inCheck) {
    updateStatus("Échec !");
  } else {
    updateStatus(whiteToMove ? "À toi de jouer (Blancs)." : "L'IA réfléchit...");
  }
}

// --- IA (negamax + alpha-beta) ---
function aiMove() {
  if (gameOver) return;
  const color = whiteToMove ? "white" : "black";
  if (color === "white") return;

  const depth = parseInt(aiLevelSelect.value, 10);
  const moves = allLegalMoves(color);
  if (moves.length === 0) {
    checkGameState();
    return;
  }

  let bestScore = -Infinity;
  let bestMove = moves[0];

  for (const move of moves) {
    const backup = {
      board: cloneBoard(board),
      castling: { ...castlingRights },
      whiteToMove
    };
    applyMoveWithCastling(board, move);
    whiteToMove = !whiteToMove;
    const score = -negamax(depth - 1, oppositeColor(color), -Infinity, Infinity);
    restoreState(backup);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  makeMove(bestMove);
  renderBoard();
  checkGameState();
}

function negamax(depth, color, alpha, beta) {
  if (depth === 0) {
    return evaluateBoard(color);
  }

  const moves = allLegalMoves(color);
  if (moves.length === 0) {
    const kingPos = findKing(color);
    const inCheck = kingPos && isSquareAttacked(kingPos.row, kingPos.col, oppositeColor(color));
    if (inCheck) return -9999;
    return 0;
  }

  let best = -Infinity;
  for (const move of moves) {
    const backup = {
      board: cloneBoard(board),
      castling: { ...castlingRights },
      whiteToMove
    };
    applyMoveWithCastling(board, move);
    whiteToMove = !whiteToMove;
    const score = -negamax(depth - 1, oppositeColor(color), -beta, -alpha);
    restoreState(backup);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

function evaluateBoard(perspectiveColor) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const val = pieceValue(p);
      const isWhite = p === p.toUpperCase();
      score += isWhite ? val : -val;
    }
  }
  return perspectiveColor === "white" ? score : -score;
}

// --- Utils ---
function cloneBoard(b) {
  return b.map((row) => row.slice());
}

function restoreState(state) {
  board = cloneBoard(state.board);
  castlingRights = { ...state.castling };
  whiteToMove = state.whiteToMove;
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
