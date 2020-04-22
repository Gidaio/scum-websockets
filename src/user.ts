import WebSocket from "ws"


export interface User {
	readonly username: string
	readonly socket: WebSocket

	ready: boolean
	hand: string[]
	passed: boolean
	position: ScumPosition
}

export function removeCards(user: User, cards: string[]): boolean {
	const newHand = [...user.hand]
		for (const card of cards) {
			const cardIndex = newHand.findIndex(newHandCard => newHandCard === card)
			if (cardIndex === -1) {
				send(user, {
					type: "badRequest",
					error: `You don't have the card ${card}!`
				})

				return false
			}

			newHand.splice(cardIndex, 1)
		}

		user.hand = newHand

		return true
}

export function send<T extends ServerToClientMessage>(user: User, message: T): void {
	if (!user.socket) {
		console.error(`User ${user.username} doesn't have a socket!`)
		return
	}

	if (user.socket.readyState !== WebSocket.OPEN) {
		console.error(`User ${user.username}'s socket isn't open!`)
	}

	user.socket.send(JSON.stringify(message))
}
