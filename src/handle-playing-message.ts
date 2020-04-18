import { ServerState } from "./server-state"
import { User } from "./user"


export function handlePlayingMessage(user: User, message: ClientToServerMessage, serverState: ServerState): void {
	switch (message.type) {
		case "playCards": {
			if (user.username !== serverState.currentPlayer) {
				user.send({
					type: "badRequest",
					error: "It's not your turn!"
				})

				break
			}

			if (serverState.board.length > 0 && message.cards.length !== serverState.board.length) {
				user.send({
					type: "badRequest",
					error: "You must play the same number of cards as are in the middle!"
				})

				break
			}

			const cardRank = message.cards[0].slice(0, 2)
			if (!message.cards.every(card => card.slice(0, 2) === cardRank)) {
				user.send({
					type: "badRequest",
					error: "All played cards must be of the same rank."
				})

				break
			}

			if (serverState.board.length > 0) {
				const boardRank = serverState.board[0].slice(0, 2)
				if (Number(cardRank) <= Number(boardRank)) {
					user.send({
						type: "badRequest",
						error: "You must exceed the rank of the cards in the middle!"
					})

					break
				}
			}

			const newHand = [...user.hand]
			for (const card of message.cards) {
				const cardIndex = newHand.findIndex(newHandCard => newHandCard === card)
				if (cardIndex === -1) {
					user.send({
						type: "badRequest",
						error: `You don't have the card ${card}!`
					})

					return
				}

				newHand.splice(cardIndex, 1)
			}

      user.hand = newHand
      if (user.hand.length === 0) {
        serverState.finishedHand(user)

        const usersRemaining = serverState.users.filter(user => user.hand.length > 0)
        if (usersRemaining.length === 1) {
          serverState.finishedHand(usersRemaining[0])
        }
      }

			serverState.board = message.cards
			serverState.lastPlayer = user.username

			if (cardRank === "13") {
				serverState.status = "resolvingRound"
				serverState.sendGameState("roundEnd")
				setTimeout(serverState.newRound.bind(serverState), 1000)
			} else {
				serverState.nextPlayer()
				serverState.sendGameState("gameStateChange")
			}

			break
		}

		case "pass": {
			if (user.username !== serverState.currentPlayer) {
				user.send({
					type: "badRequest",
					error: "It's not your turn!"
				})

				break
			}

			if (serverState.board.length === 0) {
				user.send({
					type: "badRequest",
					error: "You can't pass when you're leading. You're welcome."
				})

				break
			}

			user.passed = true
			serverState.nextPlayer()

			if (serverState.currentPlayer === serverState.lastPlayer) {
				serverState.sendGameState("roundEnd")
				setTimeout(serverState.newRound.bind(serverState), 1000)
			} else {
				serverState.sendGameState("gameStateChange")
			}

			break
		}
	}
}
