import { User } from "./user"


export class ServerState {
	public users: User[] = []
	public status: "waiting" | "playing" | "resolvingRound" = "waiting"

	public playerOrder: string[] = []
	public currentPlayerIndex = 0
	public lastPlayer: string = ""
	public board: string[] = []

	public get players(): { username: string, passed: boolean }[] {
		return this.playerOrder.map(username => ({
			username,
			passed: this.users.find(user => user.username === username)!.passed
		}))
	}

	public get currentPlayer() {
		return this.playerOrder[this.currentPlayerIndex]
	}

	public get currentUser(): User {
		return this.users.find(user => user.username === this.currentPlayer)!
	}

	public get userCount() {
		return Object.keys(this.users).length
	}

	public addUser(user: User): void {
		this.users.push(user)
	}

	public initGame(): void {
		if (this.playerOrder.length === 0) {
			this.playerOrder = shuffle(this.users.map(user => user.username))
		}

		// TODO: Needs to rotate who the deal "starts" with, i.e. who gets more cards.
		let deck = []
		for (let times = 0; times < (Math.ceil(this.users.length / 5)); times++) {
			for (const suit of ["C", "D", "H", "S"]) {
				for (let rank = 1; rank <= 13; rank++) {
					deck.push(`${rank.toString().padStart(2, "0")}${suit}`)
				}
			}
		}
		deck = shuffle(deck)

		for (let userIndex = 0; userIndex < this.users.length; userIndex++) {
			const usersRemaining = this.users.length - userIndex
			const cardsForUser = Math.ceil(deck.length / usersRemaining)
			this.users[userIndex].hand = deck.splice(0, cardsForUser)
		}
	}

	public nextPlayer(): void {
		do {
			this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerOrder.length
		} while (this.currentPlayer !== this.lastPlayer && (this.currentUser.passed || this.currentUser.hand.length === 0))
	}

	public sendGameState(type: "gameStart" | "gameStateChange" | "roundEnd"): void {
		this.users.forEach(user => {
			user.send({
				type,
				players: this.players,
				currentPlayer: this.currentPlayer,
				lastPlayer: this.lastPlayer,
				board: this.board,
				hand: user.hand
			})
		})
	}

	public broadcast<T extends ServerToClientMessage>(message: T): void {
		this.users.forEach(user => {
			user.send(message)
		})
  }
}

function shuffle<T>(array: T[]): T[] {
	const shuffledArray = [...array]

	for (let i = shuffledArray.length - 1; i > 0; i--) {
		let indexToSwap = Math.floor(Math.random() * i)
		const temp = shuffledArray[i]
		shuffledArray[i] = shuffledArray[indexToSwap]
		shuffledArray[indexToSwap] = temp
	}

	return shuffledArray
}
