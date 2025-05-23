const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');
const { createDeck, shuffleDeck, dealInitialHands, performPlayerDraw, evaluateHand, HAND_TYPES, HAND_SCORES } = require('./game.js');

const app = express();
const server = createServer(app);
const io = new Server(server);

// let gameState = {}; // Will be initialized by calling the function

function initializeGameState() {
  const deck = shuffleDeck(createDeck());
  const newGameState = {
    players: [], // Players will be added with hasCompletedDrawPhase: false
    deck: deck,
    discardPile: [],
    currentPlayerTurnIndex: 0,
    currentRound: 0,
    maxRounds: 3,
    gamePhase: 'WaitingForPlayers', // Initial phase
  };
  console.log('Game state initialized/reset:', newGameState.gamePhase, `${newGameState.players.length} players`);
  return newGameState;
}

let gameState = initializeGameState(); // Set up the initial state

/**
 * Compares two arrays of contributing ranks to determine a winner.
 * @param {number[]} ranksA
 * @param {number[]} ranksB
 * @returns {number} 1 if A wins, -1 if B wins, 0 for a tie.
 */
function compareContributingRanks(ranksA, ranksB) {
  for (let i = 0; i < Math.max(ranksA.length, ranksB.length); i++) {
    const rankValA = ranksA[i] !== undefined ? ranksA[i] : -1; // Treat undefined as lowest
    const rankValB = ranksB[i] !== undefined ? ranksB[i] : -1;
    if (rankValA > rankValB) return 1; // A wins
    if (rankValA < rankValB) return -1; // B wins
  }
  return 0; // Tie
}

function handleShowdown() {
  if (gameState.gamePhase !== 'RoundInProgress_Showdown') return;
  console.log(`Starting Showdown for Round: ${gameState.currentRound}`);
  let evaluatedPlayerResults = [];
  let bestHandScoreInRound = -1;
  // Evaluate all hands
  gameState.players.forEach(player => {
    const evalResult = evaluateHand(player.hand); // from game.js
    evaluatedPlayerResults.push({
      playerId: player.id,
      playerName: player.name,
      hand: player.hand, // For display on client
      handName: evalResult.handName,
      handStrengthScore: evalResult.score, // Score from HAND_SCORES, for ranking hands
      contributingRanks: evalResult.contributingRanks,
      isRoundWinner: false // Default to false
    });
    if (evalResult.score > bestHandScoreInRound) {
      bestHandScoreInRound = evalResult.score;
    }
  });
  // Identify players with the best hand type
  let potentialWinners = evaluatedPlayerResults.filter(r => r.handStrengthScore === bestHandScoreInRound);
  let actualRoundWinners = [];
  if (potentialWinners.length === 1) {
    actualRoundWinners = potentialWinners;
  } else if (potentialWinners.length > 1) {
    // Sort by contributingRanks to break ties
    potentialWinners.sort((a, b) => compareContributingRanks(b.contributingRanks, a.contributingRanks)); // b vs a for descending
    actualRoundWinners.push(potentialWinners[0]); // Add the top one
    // Check for true ties (multiple players with identical best contributingRanks)
    for (let i = 1; i < potentialWinners.length; i++) {
      if (compareContributingRanks(potentialWinners[0].contributingRanks, potentialWinners[i].contributingRanks) === 0) {
        actualRoundWinners.push(potentialWinners[i]);
      } else { break; } // Stop if no longer a tie
    }
  }
  // Update scores for winners and set isRoundWinner flag
  actualRoundWinners.forEach(winnerResult => {
    const winnerPlayerObj = gameState.players.find(p => p.id === winnerResult.playerId);
    if (winnerPlayerObj) { winnerPlayerObj.score += 1; } // Add 1 point to game score
    winnerResult.isRoundWinner = true;
  });
  // Attach final game scores to results
  const finalResultsForClient = evaluatedPlayerResults.map(res => ({
    ...res,
    currentPlayerScore: gameState.players.find(p => p.id === res.playerId).score
  }));
  console.log(`Showdown for Round ${gameState.currentRound} complete. Winners: ${actualRoundWinners.map(w => w.playerName).join(', ')}`);
  io.emit('roundOver_Results', { 
    roundNumber: gameState.currentRound,
    results: finalResultsForClient,
    deckSize: gameState.deck.length, // For client info
    discardPileSize: gameState.discardPile.length
  });
  // Call the next step (to be implemented)
  prepareForNextRoundOrEndGame(); 
}

function prepareForNextRoundOrEndGame() {
  gameState.currentRound++;
  console.log(`Round ${gameState.currentRound -1} ended. Current round is now: ${gameState.currentRound}. Max rounds: ${gameState.maxRounds}.`);
  if (gameState.currentRound > gameState.maxRounds) {
    // GAME OVER LOGIC
    gameState.gamePhase = 'GameOver';
    console.log('Game Over. Calculating final results.');
    let highestScore = -1;
    gameState.players.forEach(p => { if (p.score > highestScore) highestScore = p.score; });
    const gameWinners = gameState.players.filter(p => p.score === highestScore);
    io.emit('gameOver_FinalResults', {
      message: 'The game has ended!',
      players: gameState.players.map(p => ({ id: p.id, name: p.name, finalScore: p.score, isGameWinner: gameWinners.some(w => w.id === p.id) })),
      winners: gameWinners.map(w => ({ id: w.id, name: w.name, finalScore: w.score }))
    });
    // Optional: Consider a timeout then call initializeGameState() to allow a new game
    // setTimeout(() => { gameState = initializeGameState(); io.emit('gameReset', { message: 'New game can now be started.'}); }, 30000); // Reset after 30s
  } else {
    // NEXT ROUND LOGIC
    gameState.gamePhase = 'PreparingNewRound';
    console.log(`Starting new round: ${gameState.currentRound}.`);
    // Combine deck and discard pile, then shuffle
    gameState.deck.push(...gameState.discardPile);
    gameState.discardPile = [];
    gameState.deck = shuffleDeck(gameState.deck); // shuffleDeck from game.js
    // Reset player hands and draw phase status
    gameState.players.forEach(player => {
      player.hand = [];
      player.hasCompletedDrawPhase = false;
    });
    // Deal new hands
    dealInitialHands(gameState.players, gameState.deck); // from game.js
    gameState.currentPlayerTurnIndex = 0; // Or rotate dealer/first player
    gameState.gamePhase = 'RoundInProgress_DrawPhase';
    // Notify clients about the new round
    const firstPlayerOfNewRound = gameState.players[gameState.currentPlayerTurnIndex];
    gameState.players.forEach(player => {
      const playerSocket = io.sockets.sockets.get(player.socketId);
      if (playerSocket) {
        playerSocket.emit('newRoundStarted_YourHand', {
          hand: player.hand,
          round: gameState.currentRound,
          isYourTurn: player.id === firstPlayerOfNewRound.id,
          currentPlayerName: firstPlayerOfNewRound.name,
          gamePhase: gameState.gamePhase,
          playersInfo: gameState.players.map(p => ({ id: p.id, name: p.name, score: p.score, cardCount: p.hand.length, hasCompletedDrawPhase: p.hasCompletedDrawPhase })),
          deckSize: gameState.deck.length,
          discardPileSize: gameState.discardPile.length
        });
      }
    });
    console.log(`New round (${gameState.currentRound}) started. Player ${firstPlayerOfNewRound.name}'s turn for draw phase.`);
  }
}

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
  if (gameState.gamePhase === 'WaitingForPlayers' && gameState.players.length < 4) {
    const newPlayer = {
      id: socket.id,
      name: `Player ${gameState.players.length + 1}`,
      hand: [],
      score: 0,
      socketId: socket.id,
      hasCompletedDrawPhase: false // Initialize new player property
    };
    gameState.players.push(newPlayer);
    console.log(`Player ${newPlayer.name} connected (${newPlayer.id}). Total players: ${gameState.players.length}`);
    socket.emit('playerSuccessfullyJoined', { playerId: newPlayer.id, playerName: newPlayer.name, initialPlayers: gameState.players.map(p => ({id: p.id, name: p.name, score: p.score})) });
    io.emit('updatePlayerList', gameState.players.map(p => ({id: p.id, name: p.name, score: p.score}))); // Broadcast updated list to everyone

    if (gameState.players.length === 4) {
      console.log('Four players connected. Starting game and dealing hands...');
      dealInitialHands(gameState.players, gameState.deck);
      gameState.players.forEach(player => { player.hasCompletedDrawPhase = false; }); // Reset for the new round
      gameState.currentRound = 1;
      gameState.currentPlayerTurnIndex = 0; // First player's turn
      gameState.gamePhase = 'RoundInProgress_DrawPhase'; 
      const currentPlayer = gameState.players[gameState.currentPlayerTurnIndex];
      console.log(`Round ${gameState.currentRound} started. Player ${currentPlayer.name}'s turn for draw phase.`);
      // Notify Clients
      gameState.players.forEach(player => {
        const playerSocket = io.sockets.sockets.get(player.socketId);
        if (playerSocket) {
          playerSocket.emit('gameStarted_YourHand', {
            hand: player.hand,
            round: gameState.currentRound,
            isYourTurn: player.socketId === currentPlayer.socketId,
            currentPlayerName: currentPlayer.name,
            gamePhase: gameState.gamePhase,
            playersInfo: gameState.players.map(p => ({ id: p.id, name: p.name, score: p.score, cardCount: p.hand.length, hasCompletedDrawPhase: p.hasCompletedDrawPhase }))
          });
        }
      });
    }
  } else {
    console.log(`Connection attempt from ${socket.id} rejected. Game full or in progress (${gameState.gamePhase}).`);
    socket.emit('gameFullOrInProgress', { message: 'Game is currently full or in progress.' });
    // Optional: socket.disconnect(true); // Force disconnect if not allowing spectators
  }

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    const disconnectedPlayerIndex = gameState.players.findIndex(player => player.socketId === socket.id);
    if (disconnectedPlayerIndex !== -1) {
      const disconnectedPlayer = gameState.players.splice(disconnectedPlayerIndex, 1)[0];
      console.log(`Player ${disconnectedPlayer.name} removed from game.`);
      io.emit('updatePlayerList', gameState.players.map(p => ({id: p.id, name: p.name, score: p.score}))); // Notify remaining players
      // If game was in a state beyond 'WaitingForPlayers' and now has < 4 players, reset
      if (gameState.players.length < 4 && gameState.gamePhase !== 'GameOver' && gameState.gamePhase !== 'WaitingForPlayers') {
        console.log('Game has fewer than 4 players. Resetting to WaitingForPlayers.');
        gameState = initializeGameState(); // Reset the entire game state
        io.emit('gameResetDueToDisconnect', { message: 'Game reset due to player disconnection. Waiting for new players.', newGameState: { gamePhase: gameState.gamePhase, players: [] } });
      }
    } else {
      console.log(`Disconnected socket ${socket.id} was not an active player.`);
    }
  });

  socket.on('playerDiscardRequest', ({ cardsToDiscardIndices }) => {
    // Validate game phase
    if (gameState.gamePhase !== 'RoundInProgress_DrawPhase') {
      socket.emit('actionError', { message: 'Not the correct game phase for discarding.' });
      return;
    }

    // Validate if it's the player's turn
    const currentPlayer = gameState.players[gameState.currentPlayerTurnIndex];
    if (socket.id !== currentPlayer.socketId) {
      socket.emit('actionError', { message: 'Not your turn to discard.' });
      return;
    }

    // Validate cardsToDiscardIndices
    if (!Array.isArray(cardsToDiscardIndices) || cardsToDiscardIndices.some(isNaN) || cardsToDiscardIndices.some(idx => idx < 0 || idx >= currentPlayer.hand.length) || cardsToDiscardIndices.length > 5) {
      socket.emit('actionError', { message: 'Invalid cards to discard. Indices must be valid and 0-5 cards.' });
      return;
    }
    // Ensure unique indices, though performPlayerDraw sorts and handles it.
    const uniqueIndices = [...new Set(cardsToDiscardIndices)];
    if (uniqueIndices.length !== cardsToDiscardIndices.length) {
        socket.emit('actionError', { message: 'Duplicate discard indices are not allowed.' });
        return;
    }


    console.log(`Player ${currentPlayer.name} requested to discard indices: ${cardsToDiscardIndices}`);
    performPlayerDraw(currentPlayer, cardsToDiscardIndices, gameState.deck, gameState.discardPile);
    currentPlayer.hasCompletedDrawPhase = true;

    console.log(`Player ${currentPlayer.name} new hand after draw:`, currentPlayer.hand.map(c=>c.id));
    socket.emit('drawActionProcessed', {
      newHand: currentPlayer.hand,
      cardsDrawn: cardsToDiscardIndices.length,
      gamePhase: gameState.gamePhase, 
      deckSize: gameState.deck.length,
      discardPileSize: gameState.discardPile.length,
      playerPublicInfo: { id: currentPlayer.id, name: currentPlayer.name, score: currentPlayer.score, cardCount: currentPlayer.hand.length, hasCompletedDrawPhase: currentPlayer.hasCompletedDrawPhase }
    });

    // Check if all players have completed their draw phase
    const allPlayersDoneDraw = gameState.players.every(p => p.hasCompletedDrawPhase);

    if (allPlayersDoneDraw) {
      gameState.gamePhase = 'RoundInProgress_Showdown';
      console.log('All players have completed the draw phase. Moving to Showdown.');
      io.emit('transitionToShowdown', {
        gamePhase: gameState.gamePhase,
        playersPublicInfo: gameState.players.map(p => ({ id: p.id, name: p.name, score: p.score, cardCount: p.hand.length, hasCompletedDrawPhase: p.hasCompletedDrawPhase })) // This is correct
      });
      handleShowdown(); // Trigger showdown logic
    } else {
      // Advance to the next player who hasn't completed the draw phase
      let nextPlayerIndex = gameState.currentPlayerTurnIndex; // Current player has just finished
      do {
        nextPlayerIndex = (nextPlayerIndex + 1) % gameState.players.length;
      } while (gameState.players[nextPlayerIndex].hasCompletedDrawPhase && nextPlayerIndex !== gameState.currentPlayerTurnIndex); // Loop until an incomplete player is found or we've checked all

      // If all other players are done (which means we are the last one to finish, but allPlayersDoneDraw was false, implies error or only 1 player left that is not done - which is current player, but current player is done)
      // This condition should ideally be caught by allPlayersDoneDraw.
      // The while loop above ensures we find the next available player unless all are done.
      gameState.currentPlayerTurnIndex = nextPlayerIndex;
      
      const nextPlayer = gameState.players[gameState.currentPlayerTurnIndex];
      console.log(`Player ${currentPlayer.name} finished draw. Next turn for draw: ${nextPlayer.name}.`);
      io.emit('nextPlayerForDraw', {
        currentPlayerTurnIndex: gameState.currentPlayerTurnIndex,
        currentPlayerName: nextPlayer.name,
        gamePhase: gameState.gamePhase,
        playersPublicInfo: gameState.players.map(p => ({ id: p.id, name: p.name, score: p.score, cardCount: p.hand.length, hasCompletedDrawPhase: p.hasCompletedDrawPhase })) // This is correct
      });
    }
  });
});

server.listen(3000, () => {
  console.log(`Server running at http://localhost:3000. Initial game phase: ${gameState.gamePhase}`);
});