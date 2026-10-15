//========== Constants ==========
const symbols = {
    white: {
        king: "♔",
        queen: "♕",
        rook: "♖",
        bishop: "♗",
        knight: "♘",
        pawn: "♙"
    },
    black: {
        king: "♚",
        queen: "♛",
        rook: "♜",
        bishop: "♝",
        knight: "♞",
        pawn: "♟"
    }
};

const moveGenerators = {
    pawn: getPawnMoves,
    knight: getKnightMoves,
    rook: getRookMoves,
    bishop: getBishopMoves,
    queen: getQueenMoves,
    king: getKingMoves
};

const startingPosition = {
    a8: ["rook", "black"],
    b8: ["knight", "black"],
    c8: ["bishop", "black"],
    d8: ["queen", "black"],
    e8: ["king", "black"],
    f8: ["bishop", "black"],
    g8: ["knight", "black"],
    h8: ["rook", "black"],

    a7: ["pawn", "black"],
    b7: ["pawn", "black"],
    c7: ["pawn", "black"],
    d7: ["pawn", "black"],
    e7: ["pawn", "black"],
    f7: ["pawn", "black"],
    g7: ["pawn", "black"],
    h7: ["pawn", "black"],

    a2: ["pawn", "white"],
    b2: ["pawn", "white"],
    c2: ["pawn", "white"],
    d2: ["pawn", "white"],
    e2: ["pawn", "white"],
    f2: ["pawn", "white"],
    g2: ["pawn", "white"],
    h2: ["pawn", "white"],

    a1: ["rook", "white"],
    b1: ["knight", "white"],
    c1: ["bishop", "white"],
    d1: ["queen", "white"],
    e1: ["king", "white"],
    f1: ["bishop", "white"],
    g1: ["knight", "white"],
    h1: ["rook", "white"]
};

const undo = document.getElementById("undo");
const reset = document.getElementById("reset");



//========== Board Setup ==========
const board = document.getElementById("board");
const boardState = {};

for (let row = 0; row < 8; row++) {
    const rank = 8 - row;

    for (let column = 0; column < 8; column++) {
        const file = String.fromCharCode(97 + column);
        const squareId = file + rank;

        const isDark = (row + column) % 2 !== 0;

        // Create the square's data
        boardState[squareId] = {
            color: isDark ? "dark" : "light",
            piece: null
        };

        // Create the square's DOM element
        const square = document.createElement("div");
        square.id = squareId;
        square.classList.add("square");

        if (isDark) {
            square.classList.add("dark");
        }

        board.appendChild(square);
    }
} //draw the board.

initializeBoard();
renderPieces(); 
let selectedSquare = null;
let currentTurn = "white";
let playing = true;
let kingMoved = { white: false, black: false };
let rookMoved = { white: { kingSide: false, queenSide: false }, black: { kingSide: false, queenSide: false } };
let castleRights = { white: true, black: true };
const moveHistory = [];

board.addEventListener("click", function (event) {
    if (!playing) return;
    const square = event.target.closest("#board > div");

    if (!square) return;

    const squareId = square.id;
    const piece = boardState[squareId].piece;

    if (selectedSquare !== null && square.classList.contains("possible-move")) { // click on a destination square
        // Save the current state to move history for undo functionality
        moveHistory.push({
            board: structuredClone(boardState),
            currentTurn: currentTurn,
            kingMoved: structuredClone(kingMoved),
            rookMoved: structuredClone(rookMoved),
            castleRights: structuredClone(castleRights)
        });
        // remove the inCheck class from all squares
        const allSquares = document.querySelectorAll("#board > div");
        allSquares.forEach(sq => sq.classList.remove("inCheck"));

        const selectedPiece = boardState[selectedSquare].piece;

        // Check if the move affects castling rights
        if(selectedPiece.color === "white") {
            if(castleRights.white) {
                detectChangeInCastleRightsForWhite(selectedSquare);
            }
        } else {
            if(castleRights.black) {
                detectChangeInCastleRightsForBlack(selectedSquare);
            }
        }

        //Check if a rook is captured and update castling rights accordingly
        if(piece && piece.type === "rook") {
            if(piece.color === "white") {
                if(squareId === "h1" && !rookMoved.white.kingSide) {
                    rookMoved.white.kingSide = true;
                    castleRights.white = checkCastleRights("white");
                } else if(squareId === "a1" && !rookMoved.white.queenSide) {
                    rookMoved.white.queenSide = true;
                    castleRights.white = checkCastleRights("white");
                }
            } else {
                if(squareId === "h8" && !rookMoved.black.kingSide) {
                    rookMoved.black.kingSide = true;
                    castleRights.black = checkCastleRights("black");
                } else if(squareId === "a8" && !rookMoved.black.queenSide) {
                    rookMoved.black.queenSide = true;
                    castleRights.black = checkCastleRights("black");
                }
            }
        }

        //check if the move is a castling move
        if(selectedPiece.type === "king") {
            const fileDiff = squareId.charCodeAt(0) - selectedSquare.charCodeAt(0);
            if(Math.abs(fileDiff) === 2) { // castling move
                if(fileDiff > 0) { // king-side castling
                    const rookFromSquare = "h" + selectedSquare[1];
                    const rookToSquare = "f" + selectedSquare[1];
                    movePiece(rookFromSquare, rookToSquare);
                } else { // queen-side castling
                    const rookFromSquare = "a" + selectedSquare[1];
                    const rookToSquare = "d" + selectedSquare[1];
                    movePiece(rookFromSquare, rookToSquare);
                }
            }
        }

        if (
            selectedPiece.type === "pawn" &&
            (squareId[1] === "8" || squareId[1] === "1")
        ) {
            promotePawn(selectedSquare, squareId, selectedPiece.color);
        } else {
            movePiece(selectedSquare, squareId);
        } // Move the selected piece to this square

        // if it's a check, highlight the king
        const enemyColor = getOpponentColor(selectedPiece.color);
        if (detectCheck(enemyColor)) {
            const kingSquare = findPiece("king", enemyColor);
            document.getElementById(kingSquare).classList.add("inCheck");
        }

        // Update the display
        renderPieces();
        selectSquare(null);
        highlightMoves([]);

        // Check for mate
        detectMate(selectedPiece.color);
        displayStatus();

        // Switch turns
        switchTurn();

        //flip the board orientation
        updateBoardOrientation();

        // material difference
        const materialDiff = getMaterialDifference();
        return;
    }
    else {
        if (piece && piece.color === currentTurn) { // click on a square with a piece of the current player's color
            selectSquare(squareId);
            const possibleMoves = moveGenerators[piece.type](squareId, piece);
            const legalMoves = getLegalMoves(piece, possibleMoves, squareId);
            highlightMoves(legalMoves);
        }
        else { // click on an empty square or a square with an opponent's piece
            selectSquare(null);
            highlightMoves([]);
        }
    }
}

);

//========== Button Functions ==========
reset.addEventListener("click", function () {
    for (const squareId in boardState) {
        boardState[squareId].piece = null;
    }
    initializeBoard();
    renderPieces();
    selectedSquare = null;
    currentTurn = "white";
    updateBoardOrientation();
    playing = true;
    kingMoved = { white: false, black: false };
    rookMoved = { white: { kingSide: false, queenSide: false }, black: { kingSide: false, queenSide: false } };
    castleRights = { white: true, black: true };
    text.textContent = "white to move";
    const allSquares = document.querySelectorAll("#board > div");
    allSquares.forEach(sq => sq.classList.remove("inCheck"));
    //clear move history
    moveHistory.length = 0;
});
undo.addEventListener("click", function () {
    if (moveHistory.length === 0) return; 

    const lastState = moveHistory.pop();
    for (const squareId in boardState) {
        boardState[squareId].piece =
            lastState.board[squareId].piece;
    }
    currentTurn = lastState.currentTurn;
    updateBoardOrientation();
    kingMoved = lastState.kingMoved;
    rookMoved = lastState.rookMoved;
    castleRights = lastState.castleRights;
    playing = true;
    renderPieces();
    selectSquare(null);
    highlightMoves([]);
    text.textContent = `${currentTurn} to move`;
    const allSquares = document.querySelectorAll("#board > div");
    allSquares.forEach(sq => sq.classList.remove("inCheck"));

    if (detectCheck(currentTurn)) {
        const kingSquare = findPiece("king", currentTurn);
        document.getElementById(kingSquare).classList.add("inCheck");
    }
});


//========== Move Generators ==========
function getPawnMoves(squareId, piece) {
    const file = squareId[0];
    const rank = Number(squareId[1]);
    const moves = [];

    //moving

    const direction = piece.color === "white" ? 1 : -1;
    const nextRank = rank + direction;
    const nextSquare = file + nextRank;
    const isEmpty = boardState[nextSquare] && boardState[nextSquare].piece === null;
    if (isEmpty) {
        const isStartingRank = (piece.color === "white" && rank === 2) || (piece.color === "black" && rank === 7);
        if (isStartingRank) {
            const twoSquaresAhead = file + (rank + 2 * direction);
            const isTwoSquaresEmpty = boardState[twoSquaresAhead] && boardState[twoSquaresAhead].piece === null;
            if (isTwoSquaresEmpty) {
                moves.push(twoSquaresAhead);
            }
        }
        moves.push(nextSquare);
    
    }

    // capturing

    const captureFiles = [String.fromCharCode(file.charCodeAt(0) - 1), String.fromCharCode(file.charCodeAt(0) + 1)];
    for (const captureFile of captureFiles) {
        const captureSquare = captureFile + nextRank;
        const isCapture = boardState[captureSquare] && boardState[captureSquare].piece && boardState[captureSquare].piece.color !== piece.color;
        if (isCapture) {
            moves.push(captureSquare);
        }
    }
    return moves;
}

function getKnightMoves(squareId, piece) {
    const file = squareId[0];
    const rank = Number(squareId[1]);
    const moves = [];
    const moves_basic = [];
    const firstDirections = [2, -2];
    const secondDirections = [1, -1];
    for (const direction1 of firstDirections) {
        for (const direction2 of secondDirections) {
            let targetSquare = (String.fromCharCode(file.charCodeAt(0) + direction1)) + (rank + direction2);
            moves_basic.push(targetSquare);
        }
    }
    for (const direction1 of firstDirections) {
        for (const direction2 of secondDirections) {
            let targetSquare = (String.fromCharCode(file.charCodeAt(0) + direction2)) + (rank + direction1);
            moves_basic.push(targetSquare);
        }
    }
    for (const move of moves_basic) {
        if (boardState[move] && (boardState[move].piece === null || boardState[move].piece.color !== piece.color)) {
            moves.push(move);
        }
    }
    return moves;
}

function getRookMoves(squareId, piece) {
    const file = squareId[0];
    const rank = Number(squareId[1]);
    const moves = [];
    const directions = [1, -1];
    // vertical moves
    for (const direction of directions) {
        let currentRank = rank;
        while (true) {
            currentRank += direction;
            const targetSquare = file + currentRank;
            if (currentRank < 1 || currentRank > 8) {
                break;
            }
            if (boardState[targetSquare].piece !== null) {
                if (boardState[targetSquare].piece.color !== piece.color) {
                    moves.push(targetSquare);
                }
                break;
            }
            
            moves.push(targetSquare);
        }
        // horizontal moves
        let currentFile = file.charCodeAt(0);
        while (true) {
            currentFile += direction;
            const targetSquare = String.fromCharCode(currentFile) + rank;
            if (currentFile < 97 || currentFile > 104) {
                break;
            }
            if (boardState[targetSquare].piece !== null) {
                if (boardState[targetSquare].piece.color !== piece.color) {
                    moves.push(targetSquare);
                }
                break;
            }
            
            moves.push(targetSquare);
        }
    }
    return moves;
}

function getBishopMoves(squareId, piece) {
    const file = squareId[0];
    const rank = Number(squareId[1]);
    const moves = [];
    const directions = [1, -1];
    for (const fileDirection of directions) {
        for (const rankDirection of directions) {
            let currentFile = file.charCodeAt(0);
            let currentRank = rank;
            while (true) {
                currentFile += fileDirection;
                currentRank += rankDirection;
                const targetSquare = String.fromCharCode(currentFile) + currentRank;
                if (currentFile < 97 || currentFile > 104 || currentRank < 1 || currentRank > 8) {
                    break;
                }
                if (boardState[targetSquare].piece !== null) {
                    if (boardState[targetSquare].piece.color !== piece.color) {
                        moves.push(targetSquare);
                    }
                    break;
                }
                
                moves.push(targetSquare);
            }
        }
    }
    return moves;
}

function getQueenMoves(squareId, piece) {
    return getRookMoves(squareId, piece).concat(getBishopMoves(squareId, piece));
}

function getKingMoves(squareId, piece) {
    const file = squareId[0];
    const rank = Number(squareId[1]);
    const moves = [];
    const directions = [1, -1, 0];
    for (const fileDirection of directions) {
        for (const rankDirection of directions) {
            if (fileDirection === 0 && rankDirection === 0) {
                continue;
            }
            const targetSquare = String.fromCharCode(file.charCodeAt(0) + fileDirection) + (rank + rankDirection);
            if (targetSquare[0] >= 'a' && targetSquare[0] <= 'h' && Number(targetSquare[1]) >= 1 && Number(targetSquare[1]) <= 8) {
                if (boardState[targetSquare].piece === null || boardState[targetSquare].piece.color !== piece.color) {
                    moves.push(targetSquare);
                }
            }
        }
    }
    if (castleRights[piece.color]) {
        if (!rookMoved[piece.color].kingSide) {
            const kingSideSquares = [
                String.fromCharCode(file.charCodeAt(0) + 1) + rank,
                String.fromCharCode(file.charCodeAt(0) + 2) + rank
            ];

            if (kingSideSquares.every(sq => boardState[sq].piece === null)) {
                if (
                    !detectCheck(piece.color) &&
                    !isSquareUnderAttack(kingSideSquares[0], piece.color) &&
                    !isSquareUnderAttack(kingSideSquares[1], piece.color)
                ) {
                    moves.push(kingSideSquares[1]);
                }
            }
        }
        if (!rookMoved[piece.color].queenSide) {
            const queenSideSquares = [String.fromCharCode(file.charCodeAt(0) - 1) + rank, String.fromCharCode(file.charCodeAt(0) - 2) + rank, String.fromCharCode(file.charCodeAt(0) - 3) + rank];
            if (queenSideSquares.every(sq => boardState[sq].piece === null)) {
                if (
                    !detectCheck(piece.color) &&
                    !isSquareUnderAttack(queenSideSquares[0], piece.color) &&
                    !isSquareUnderAttack(queenSideSquares[1], piece.color)
                ) {
                    moves.push(queenSideSquares[1]);
                }
            }
        }
        
    }
    return moves;
}

function getKingMovesWithoutCastling(squareId, piece) {
    const file = squareId[0];
    const rank = Number(squareId[1]);
    const moves = [];
    const directions = [1, -1, 0];
    for (const fileDirection of directions) {
        for (const rankDirection of directions) {
            if (fileDirection === 0 && rankDirection === 0) {
                continue;
            }
            const targetSquare = String.fromCharCode(file.charCodeAt(0) + fileDirection) + (rank + rankDirection);
            if (targetSquare[0] >= 'a' && targetSquare[0] <= 'h' && Number(targetSquare[1]) >= 1 && Number(targetSquare[1]) <= 8) {
                if (boardState[targetSquare].piece === null || boardState[targetSquare].piece.color !== piece.color) {
                    moves.push(targetSquare);
                }
            }
        }
    }
    return moves;
}

//========== helpers ==========
function initializeBoard() {
    for (const squareId in startingPosition) {
    const [type, color] = startingPosition[squareId];

    boardState[squareId].piece = { type, color };
    }
} //initialises the boardState with the starting position of pieces.

function renderPieces() {
    for (const squareId in boardState) {
        const squareElement = document.getElementById(squareId);
        const piece = boardState[squareId].piece;

        squareElement.textContent = piece
            ? symbols[piece.color][piece.type]
            : "";
    }
} //renders boardState to the DOM.

function switchTurn() {
    if (!playing) return;
    currentTurn = currentTurn === "white" ? "black" : "white";
} //switches the current turn between white and black.

function selectSquare(squareId) {

    // 1. Remove the previous highlight
    if (selectedSquare !== null) {
        document
            .getElementById(selectedSquare)
            .classList.remove("selected");
    }

    // 2. Remember the new selection
    selectedSquare = squareId;

    // 3. Highlight the new square
    if (selectedSquare !== null) {
        document
            .getElementById(selectedSquare)
            .classList.add("selected");
    }
} //selects a square and highlights it, while removing the highlight from the previously selected square.

function highlightMoves(moves) {
    // 1. Remove previous highlights
    const previousHighlights = document.querySelectorAll("#board > div.possible-move");
    previousHighlights.forEach(square => square.classList.remove("possible-move"));

    // 2. Highlight new possible moves
    moves.forEach(move => {
        const squareElement = document.getElementById(move);
        if (squareElement) {
            squareElement.classList.add("possible-move");
        }
    });
} //highlights the possible moves for the selected piece, while removing the highlights from the previously highlighted squares.

function getLegalMoves(piece, moves, currentSquare) {

    const legalMoves = [];
    for (const move of moves) {
        // Save the original position
        const originalPiece = boardState[currentSquare].piece;
        const capturedPiece = boardState[move].piece;

        // Simulate the candidate move
        boardState[currentSquare].piece = null;
        boardState[move].piece = piece;

        let rookFromSquare = null;
        let rookToSquare = null;
        let rookPiece = null;

        // Check whether this king move is castling
        if (
            piece.type === "king" &&
            Math.abs(move.charCodeAt(0) - currentSquare.charCodeAt(0)) === 2
        ) {
            const rank = currentSquare[1];
            const kingSide = move.charCodeAt(0) > currentSquare.charCodeAt(0);

            rookFromSquare = (kingSide ? "h" : "a") + rank;
            rookToSquare = (kingSide ? "f" : "d") + rank;

            rookPiece = boardState[rookFromSquare].piece;

            boardState[rookFromSquare].piece = null;
            boardState[rookToSquare].piece = rookPiece;
        }

        const kingSquare = findPiece("king", piece.color);
        const enemyColor = getOpponentColor(piece.color);
        const enemyPossibleMoves = getAllPossibleMoves(enemyColor);

        // Check if the king is in check after the move
        const illegal = enemyPossibleMoves.includes(kingSquare);
        

        

        // Restore the original position
        boardState[currentSquare].piece = originalPiece;
        boardState[move].piece = capturedPiece;

        if (rookFromSquare !== null) {
            boardState[rookFromSquare].piece = rookPiece;
            boardState[rookToSquare].piece = null;
        }

        // Keep only safe moves
        if (!illegal) {
            legalMoves.push(move);
        }
    }

    return legalMoves;
} //returns the legal moves for a piece by simulating each possible move and checking if it would leave the king in check.

function updateBoardOrientation() {
    board.classList.toggle("flipped", currentTurn === "black");
}

function findPiece(type, color) {
    for (const squareId in boardState) {
        const piece = boardState[squareId].piece;

        if (piece && piece.type === type && piece.color === color) {
            return squareId;
        }
    }

    return null;
} //finds the square containing a piece of the specified type and color.

function getOccupiedSquares(color) {
    const squares = [];

    for (const squareId in boardState) {
        const piece = boardState[squareId].piece;

        if (piece && piece.color === color) {
            squares.push(squareId);
        }
    }

    return squares;
} //returns an array of square IDs that are occupied by pieces of the specified color.

function detectMate(currentPlayer) {
    const enemyColor = getOpponentColor(currentPlayer);
    const enemyLegalMoves = getAllLegalMoves(enemyColor);
    if (enemyLegalMoves.length > 0) {
        return false;
    }
    playing = false;
    if (detectCheck(enemyColor)) {
        return "checkmate";
    } else {
        return "stalemate";
    }
} //detects if the game is in checkmate or stalemate.

function getPawnCaptureMoves(squareId, piece) {
    const file = squareId[0];
    const rank = Number(squareId[1]);
    const moves = [];
    const direction = piece.color === "white" ? 1 : -1;
    const nextRank = rank + direction;
    const captureFiles = [String.fromCharCode(file.charCodeAt(0) - 1), String.fromCharCode(file.charCodeAt(0) + 1)];
    for (const captureFile of captureFiles) {
        const captureSquare = captureFile + nextRank;
        const isCapture = boardState[captureSquare] && boardState[captureSquare].piece && boardState[captureSquare].piece.color !== piece.color;
        if (isCapture) {
            moves.push(captureSquare);
        }
    }
    return moves;
} //returns the squares where a pawn can capture an opponent's piece.

function displayStatus() {
    const statusElement = document.getElementById("text");
    const enemyColor = getOpponentColor(currentTurn);
    if (!playing) {
        const check = detectCheck(enemyColor);
        if (check) {
            statusElement.textContent = `${currentTurn} won by checkmate!`;
        } else {
            statusElement.textContent = `Draw by stalemate.`;
        }
    } else {
        statusElement.textContent = `${enemyColor} to move`;
    }
} //updates the status message to indicate whose turn it is, or if the game has ended in checkmate or stalemate. QUIRK: it displays the opposite of currentTurn because the turn is switched after a move is made.

function getOpponentColor(color) {
    return color === "white" ? "black" : "white";
} //returns the opponent's color given a color.

function movePiece(fromSquare, toSquare) {
    const piece = boardState[fromSquare].piece;
    boardState[toSquare].piece = piece;
    boardState[fromSquare].piece = null;
} //moves a piece from one square to another.

function detectCheck(color) {
    const kingSquare = findPiece("king", color);
    const enemyColor = getOpponentColor(color);
    const enemyOccupiedSquares = getOccupiedSquares(enemyColor);

    for (const square of enemyOccupiedSquares) {
        const enemyPiece = boardState[square].piece;
        let enemyPossibleMoves;
        if (enemyPiece.type === "pawn") {
            enemyPossibleMoves = getPawnCaptureMoves(square, enemyPiece);
        } else {
            if (enemyPiece.type === "king") {
                enemyPossibleMoves = getKingMovesWithoutCastling(square, enemyPiece);
            } else {
                enemyPossibleMoves = moveGenerators[enemyPiece.type](square, enemyPiece);
            }
        }

        if (enemyPossibleMoves.includes(kingSquare)) {
            return true;
        }
    }

    return false;
} //detects if the king of the specified color is in check by checking if any of the opponent's pieces can move to the king's square.

function getAllPossibleMoves(color) {
    const allMoves = [];
    const occupiedSquares = getOccupiedSquares(color);

    for (const square of occupiedSquares) {
        const piece = boardState[square].piece;
        const possibleMoves = moveGenerators[piece.type](square, piece);
        allMoves.push(...possibleMoves);
    }

    return allMoves;
} //returns an array of all possible moves for pieces of the specified color, without considering whether those moves would leave the king in check.

function getAllLegalMoves(color) {
    const allLegalMoves = [];
    const occupiedSquares = getOccupiedSquares(color);

    for (const square of occupiedSquares) {
        const piece = boardState[square].piece;
        const possibleMoves = moveGenerators[piece.type](square, piece);
        const legalMoves = getLegalMoves(piece, possibleMoves, square);
        allLegalMoves.push(...legalMoves);
    }

    return allLegalMoves;
} //returns an array of all legal moves for pieces of the specified color, considering whether those moves would leave the king in check.

function checkCastleRights(color) {
    if (kingMoved[color] || (rookMoved[color].kingSide && rookMoved[color].queenSide)) {
        return false;
    }
    return true;
}//checks if castling rights are still valid for the specified color by checking if the king or both rooks have moved.

function detectChangeInCastleRightsForWhite(fromSquare) {
    if (fromSquare === "e1" && !kingMoved.white) {
        kingMoved.white = true;
        castleRights.white = false;
    }
    else if (fromSquare === "h1" && !rookMoved.white.kingSide) {
        rookMoved.white.kingSide = true;
        castleRights.white = checkCastleRights("white");
    }
    else if (fromSquare === "a1" && !rookMoved.white.queenSide) {
        rookMoved.white.queenSide = true;
        castleRights.white = checkCastleRights("white");
    }
} //detects if the move affects castling rights for white pieces and updates the kingMoved and rookMoved objects accordingly. It checks if the king or rooks have moved from their original positions and updates the corresponding flags. If a rook has moved, it also checks if castling rights are still valid for white.

function detectChangeInCastleRightsForBlack(fromSquare) {
    if (fromSquare === "e8" && !kingMoved.black) {
        kingMoved.black = true;
        castleRights.black = false;
    }
    else if (fromSquare === "h8" && !rookMoved.black.kingSide) {
        rookMoved.black.kingSide = true;
        castleRights.black = checkCastleRights("black");
    }
    else if (fromSquare === "a8" && !rookMoved.black.queenSide) {
        rookMoved.black.queenSide = true;
        castleRights.black = checkCastleRights("black");
    }
} //same as above but for black.

function isSquareUnderAttack(squareId, color) {
    const enemyColor = getOpponentColor(color);
    const enemyOccupiedSquares = getOccupiedSquares(enemyColor);

    for (const square of enemyOccupiedSquares) {
        const enemyPiece = boardState[square].piece;
        let enemyPossibleMoves;
        if (enemyPiece.type === "pawn") {
            enemyPossibleMoves = getPawnCaptureMoves(square, enemyPiece);
        } else if (enemyPiece.type === "king") {
            enemyPossibleMoves = getKingMovesWithoutCastling(square, enemyPiece);
        }
         else {
            enemyPossibleMoves = moveGenerators[enemyPiece.type](square, enemyPiece);
        }

        if (enemyPossibleMoves.includes(squareId)) {
            return true;
        }
    }

    return false;
} //checks if a specific square is under attack by any of the opponent's pieces. It iterates through all the opponent's occupied squares and checks if any of their possible moves can reach the specified square.

function promotePawn(fromSquare, toSquare, color) {
    boardState[fromSquare].piece = null;
    boardState[toSquare].piece = { type: "queen", color: color };
    renderPieces();
}

//=======pending=========
function countMaterial(color) {
    let materialCount = 0;
    for (const squareId in boardState) {
        const piece = boardState[squareId].piece;
        if (piece && piece.color === color) {
            switch (piece.type) {
                case "pawn":
                    materialCount += 1;
                    break;
                case "knight":
                case "bishop":
                    materialCount += 3;
                    break;
                case "rook":
                    materialCount += 5;
                    break;
                case "queen":
                    materialCount += 9;
                    break;
            }
        }
    }
    return materialCount;
} 

function getMaterialDifference() {
    const whiteMaterial = countMaterial("white");
    const blackMaterial = countMaterial("black");
    return whiteMaterial - blackMaterial;
}