// --- Représentation du plateau ---
// Codes :
// majuscules = blancs, minuscules = noirs
// P/p = pion (affiché 💩)
// K/k = roi (affiché 🐐👑)
// Q/R/B/N = dame, tour, fou, cavalier

let board = [];
let selected = null;
let possibleMoves = [];
let whiteToMove = true;
let gameOver = false;

let scoreWhite = 0;
let scoreBlack = 0;

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const turnEl = document.getElementById("turn-indicator");
const scoreWhiteEl = document.getElementById("score-white");
const scoreBlackEl = document.getElementById("score-black");
const aiLevelSelect = document.getElementById("ai-level");
const newGameBtn = document.getElementById("new-game");

// --- Initialisation ---

function initBoard() {
  // Position de départ classique
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

function renderBoard() {
  const squares = boardEl.querySelectorAll(".square");
  squares.forEach((sq) => {
    const r = parseInt(sq.dataset.row, 10);
    const c = parseInt(sq.dataset.col, 10);
    const piece = board[r][c];
    sq.textContent = pieceToChar(piece);
    sq.classList.remove("selected", "move-target", "check");
  });

  // surligner les cases possibles
  possibleMoves.forEach((m) => {
    const idx = m.toRow * 8 + m.toCol;
    squares[idx].classList.add("move-target");
  });

  // surligner le roi en échec
  const kingPos = findKing(whiteToMove ? "white" : "black");
  if (kingPos && isSquareAttacked(kingPos.row, kingPos.col, whiteToMove ? "black" : "white")) {
    const idx = kingPos.row * 8 + kingPos.col;
    squares[idx].classList.add("check");
  }
}

function pieceToChar(p) {
  if (!p) return "";
  const isWhite = p === p.toUpperCase();
  const type = p.toUpperCase();
  if (type === "P") return "💩";
  if (type === "K") return "🐐👑";
  if (type === "Q") return isWhite ? "♕" : "♛";
  if (type === "R") return isWhite ? "♖" : "♜";
  if (type === "B") return isWhite ? "♗" : "♝";
  if (type === "N") return isWhite ? "♘" : "♞";
  return "?";
}

// --- Gestion des clics ---

function onSquareClick(e) {
  if (gameOver) return;
  const row = parseInt(e.currentTarget.dataset.row, 10);
  const col = parseInt(e.currentTarget.dataset.col, 10);
  const piece = board[row][col];

  // Si c'est au tour des blancs, l'IA joue les noirs, et inversement
  const playerColor = whiteToMove ? "white" : "black";

  // Si on clique sur une case de destination possible
  const move = possibleMoves.find(
    (m) => m.toRow === row && m.toCol === col
  );
  if (selected && move) {
    makeMove(move);
    renderBoard();
    checkGameState();
    if (!gameOver) {
      // Tour de l'IA
      setTimeout(aiMove, 200);
    }
    return;
  }

  // Sinon, sélection d'une pièce du joueur humain
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

// --- Utilitaires couleur/pièces ---

function pieceBelongsToColor(piece, color) {
  if (!piece) return false;
  const isWhite = piece === piece.toUpperCase();
  return color === "white" ? isWhite : !isWhite;
}

function oppositeColor(color) {
  return color === "white" ? "black" : "white";
}

// --- Génération de coups ---

function generateLegalMovesForSquare(row, col, color) {
  const piece = board[row][col];
  if (!piece || !pieceBelongsToColor(piece, color)) return [];
  const pseudo = generatePseudoLegalMovesForSquare(row, col, color);
  // Filtrer les coups qui laissent le roi en échec
  const legal = [];
  for (const m of pseudo) {
    const backup = cloneBoard(board);
    applyMove(board, m);
    const kingPos = findKing(color);
    const inCheck = kingPos && isSquareAttacked(kingPos.row, kingPos.col, oppositeColor(color));
    board = backup;
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
    // avance simple
    const nr = row + dirPawn;
    if (inBounds(nr, col) && board[nr][col] === "") {
      addPawnMove(row, col, nr, col, color, moves);
      // double pas
      const nr2 = row + 2 * dirPawn;
      if (row === startRow && board[nr2][col] === "") {
        moves.push({ fromRow: row, fromCol: col, toRow: nr2, toCol: col });
      }
    }
    // captures
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
    // (pas de roque pour simplifier)
  }

  return moves;
}

function addPawnMove(fr, fc, tr, tc, color, moves) {
  // promotion si on atteint la dernière rangée
  if ((color === "white" && tr === 0) || (color === "black" && tr === 7)) {
    // on promeut en dame
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

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

// --- Application de coup ---

function applyMove(b, move) {
  const piece = b[move.fromRow][move.fromCol];
  let movedPiece = piece;
  if (move.promotion) {
    // promotion en dame
    movedPiece = piece === piece.toUpperCase() ? "Q" : "q";
  }
  b[move.toRow][move.toCol] = movedPiece;
  b[move.fromRow][move.fromCol] = "";
}

function makeMove(move) {
  const piece = board[move.fromRow][move.fromCol];
  const captured = board[move.toRow][move.toCol];

  applyMove(board, move);

  // mise à jour score si capture
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

// --- Détection du roi, échec, mat ---

function findKing(color) {
  const isWhite = color === "white";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      if (p.toUpperCase() === "K") {
        const belongs = pieceBelongsToColor(p, color);
        if (belongs) return { row: r, col: c };
      }
    }
  }
  return null;
}

function isSquareAttacked(row, col, byColor) {
  // On parcourt toutes les pièces de byColor et on voit si elles peuvent aller sur (row,col)
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

// --- IA (minimax simple) ---

function aiMove() {
  if (gameOver) return;
  const color = whiteToMove ? "white" : "black";
  if (color === "white") return; // humain = blancs

  const depth = parseInt(aiLevelSelect.value, 10); // 1,2,3
  const moves = allLegalMoves(color);
  if (moves.length === 0) {
    checkGameState();
    return;
  }

  let bestScore = -Infinity;
  let bestMove = moves[0];

  for (const move of moves) {
    const backup = cloneBoard(board);
    applyMove(board, move);
    const score = -negamax(depth - 1, oppositeColor(color), -Infinity, Infinity);
    board = backup;
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
    // mat ou pat
    const kingPos = findKing(color);
    const inCheck = kingPos && isSquareAttacked(kingPos.row, kingPos.col, oppositeColor(color));
    if (inCheck) {
      return -9999; // très mauvais
    }
    return 0; // pat
  }

  let best = -Infinity;
  for (const move of moves) {
    const backup = cloneBoard(board);
    applyMove(board, move);
    const score = -negamax(depth - 1, oppositeColor(color), -beta, -alpha);
    board = backup;
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
  // si perspective = noirs, on inverse
  return perspectiveColor === "white" ? score : -score;
}

// --- Utils ---

function cloneBoard(b) {
  return b.map((row) => row.slice());
}

// --- Événements ---

newGameBtn.addEventListener("click", () => {
  initBoard();
});

createBoardUI();
initBoard();
updateScores();
