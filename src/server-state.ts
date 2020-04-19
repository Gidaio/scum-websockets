import { User } from "./user"


export class ServerState {
	public users: User[] = []
	public status: "waiting" | "playing" | "resolvingRound" | "trading" = "waiting"

	public playerOrder: string[] = []
	public currentPlayerIndex = 0
	public waitingOnTrades: string[] = []
	private finishedPlayers: string[] = []

	public lastPlayer: string = ""
	public board: string[] = []

	public get players(): Player[] {
		return this.playerOrder.map(username => {
			const user = this.users.find(user => user.username === username)!
			return {
				username,
				position: user.position,
				passed: user.passed,
				finished: user.hand.length === 0
			}
		})
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
		this.dealCards()
	}

	public newHand(): void {
		this.dealCards()

		this.board = []
		this.lastPlayer = ""
		this.finishedPlayers = []

		this.status = "trading"

		const king = this.users.find(user => user.position === "king")!
		const scum = this.users.find(user => user.position === "scum")!
		const scumIndex = this.players.findIndex(player => player.username === scum.username)

		this.currentPlayerIndex = scumIndex

		const scumCards = scum.hand.sort((a, b) => a < b ? 1 : -1).splice(0, 2)
		king.hand.push(...scumCards)

		scum.send({
			type: "gameStateChange",
			players: this.players,
			currentPlayer: this.currentPlayer,
			lastPlayer: this.lastPlayer,
			board: this.board,
			hand: scum.hand
		})
		scum.send({
			type: "cardsSent",
			player: king.username,
			cards: scumCards
		})

		king.send({
			type: "gameStateChange",
			players: this.players,
			currentPlayer: this.currentPlayer,
			lastPlayer: this.lastPlayer,
			board: this.board,
			hand: king.hand
		})
		king.send({
			type: "cardsReceived",
			player: scum.username,
			cards: scumCards
		})

		this.waitingOnTrades.push(king.username)

		if (this.players.length >= 4) {
			const queen = this.users.find(user => user.position === "queen")!
			const viceScum = this.users.find(user => user.position === "vice-scum")!

			const scumCards = viceScum.hand.sort((a, b) => a < b ? 1 : -1).splice(0, 1)
			queen.hand.push(...scumCards)

			viceScum.send({
				type: "gameStateChange",
				players: this.players,
				currentPlayer: this.currentPlayer,
				lastPlayer: this.lastPlayer,
				board: this.board,
				hand: viceScum.hand
			})
			viceScum.send({
				type: "cardsSent",
				player: queen.username,
				cards: scumCards
			})

			queen.send({
				type: "gameStateChange",
				players: this.players,
				currentPlayer: this.currentPlayer,
				lastPlayer: this.lastPlayer,
				board: this.board,
				hand: queen.hand
			})
			queen.send({
				type: "cardsReceived",
				player: viceScum.username,
				cards: scumCards
			})

			this.waitingOnTrades.push(queen.username)
		}
	}

	private dealCards(): void {
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

	public newRound(): void {
		this.board = []
    this.lastPlayer = ""
    this.status = "playing"
    this.users.forEach(user => { user.passed = false })
    if (this.currentUser.hand.length === 0) {
      this.nextPlayer()
    }
    this.sendGameState("gameStateChange")
	}

	public finishedHand(user: User): void {
		this.finishedPlayers.push(user.username)

		if (this.finishedPlayers.length === 1) {
			const currentKing = this.users.find(user => user.position === "king")
			if (currentKing) {
				currentKing.position = "neutral"
			}

			user.position = "king"
		} else if (this.players.length >= 4 && this.finishedPlayers.length == 2) {
			const currentQueen = this.users.find(user => user.position === "queen")
			if (currentQueen) {
				currentQueen.position = "neutral"
			}

			user.position = "queen"
		} else if (this.players.length >= 4 && this.finishedPlayers.length === this.players.length - 1) {
			const currentViceScum = this.users.find(user => user.position === "vice-scum")
			if (currentViceScum) {
				currentViceScum.position = "scum"
			}

			user.position = "vice-scum"
		} else if (this.finishedPlayers.length === this.players.length) {
			user.position = "scum"
		} else {
			user.position = "neutral"
		}
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
