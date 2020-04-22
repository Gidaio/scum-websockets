import {
	ServerState,
	broadcast,
	currentPlayer,
	finishedHand,
	nextPlayer,
	newHand,
	newRound,
	sendGameState
} from "./server-state"
import { User, removeCards, send } from "./user"


export function handlePlayingMessage(user: User, message: ClientToServerMessage, serverState: ServerState): void {
	switch (message.type) {
		case "playCards": {
			if (user.username !== currentPlayer(serverState)) {
				send(user, {
					type: "badRequest",
					error: "It's not your turn!"
				})

				break
			}

			if (serverState.board.length > 0 && message.cards.length !== serverState.board.length) {
				send(user, {
					type: "badRequest",
					error: "You must play the same number of cards as are in the middle!"
				})

				break
			}

			const cardRank = message.cards[0].slice(0, 2)
			if (!message.cards.every(card => card.slice(0, 2) === cardRank)) {
				send(user, {
					type: "badRequest",
					error: "All played cards must be of the same rank."
				})

				break
			}

			if (serverState.board.length > 0) {
				const boardRank = serverState.board[0].slice(0, 2)
				if (Number(cardRank) <= Number(boardRank)) {
					send(user, {
						type: "badRequest",
						error: "You must exceed the rank of the cards in the middle!"
					})

					break
				}
			}

			if (!removeCards(user, message.cards)) {
				return
			}

			if (user.hand.length === 0) {
				finishedHand(serverState, user)

				const usersRemaining = serverState.users.filter(user => user.hand.length > 0)
				if (usersRemaining.length === 1) {
					finishedHand(serverState, usersRemaining[0])

					broadcast(serverState, {
						type: "handEnd"
					})

					setTimeout(newHand, 2000, serverState)
				}
			}

			serverState.board = message.cards
			serverState.lastPlayer = user.username

			if (cardRank === "13") {
				serverState.status = "resolvingRound"
				sendGameState(serverState, "roundEnd")
				setTimeout(newRound, 2000, serverState)
			} else {
				nextPlayer(serverState)
				sendGameState(serverState, "gameStateChange")
			}

			break
		}

		case "pass": {
			if (user.username !== currentPlayer(serverState)) {
				send(user, {
					type: "badRequest",
					error: "It's not your turn!"
				})

				break
			}

			if (serverState.board.length === 0) {
				send(user, {
					type: "badRequest",
					error: "You can't pass when you're leading. You're welcome."
				})

				break
			}

			user.passed = true
			nextPlayer(serverState)

			if (currentPlayer(serverState) === serverState.lastPlayer) {
				sendGameState(serverState, "roundEnd")
				setTimeout(newRound, 2000, serverState)
			} else {
				sendGameState(serverState, "gameStateChange")
			}

			break
		}
	}
}
