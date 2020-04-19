import WebSocket from "ws"


export class User {
	private _username: string
	private socket: WebSocket

	public ready: boolean = false
	public hand: string[] = []
	public passed: boolean = false
	public position: ScumPosition = "neutral"

	public get username() {
		return this._username
	}

	constructor (username: string, socket: WebSocket) {
		this._username = username
		this.socket = socket
	}

	public removeCards(cards: string[]): boolean {
		const newHand = [...this.hand]
		for (const card of cards) {
			const cardIndex = newHand.findIndex(newHandCard => newHandCard === card)
			if (cardIndex === -1) {
				this.send({
					type: "badRequest",
					error: `You don't have the card ${card}!`
				})

				return false
			}

			newHand.splice(cardIndex, 1)
		}

		this.hand = newHand

		return true
	}

	public send<T extends ServerToClientMessage>(message: T): void {
		if (!this.socket) {
			console.error(`User ${this._username} doesn't have a socket!`)
			return
		}

		if (this.socket.readyState !== WebSocket.OPEN) {
			console.error(`User ${this._username}'s socket isn't open!`)
		}

		this.socket.send(JSON.stringify(message))
	}
}
