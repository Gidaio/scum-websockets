import WebSocket from "ws"


class ServerState {
	public users: User[] = []
	public status: "waiting" | "playing" | "resolvingRound" = "waiting"

	public playerOrder: string[] = []
	public currentPlayerIndex = 0
	public board: { lastPlayer: string, cards: string[] } = {
		lastPlayer: "",
		cards: []
	}

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
		} while (this.currentUser.passed || this.currentUser.hand.length === 0)
	}

	public sendGameState(type: "gameStart" | "gameStateChange" | "roundEnd"): void {
		this.users.forEach(user => {
			user.send({
				type,
				players: this.players,
				currentPlayer: this.currentPlayer,
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

class User {
	private _username: string
	private socket: WebSocket

	public ready: boolean = false
	public hand: string[] = []
	public passed: boolean = false

	public get username() {
		return this._username
	}

	constructor (username: string, socket: WebSocket) {
		this._username = username
		this.socket = socket
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


const serverState = new ServerState()


export function scumController(wsServer: WebSocket.Server) {
	wsServer.on("connection", socket => {
		let user: User | null = null

		socket.on("message", data => {
			const message: ClientToServerMessage = JSON.parse(data.toString())

			if (!user) {
				user = handleLoginMessage(socket, message)
				return
			} else {
				switch (serverState.status) {
					case "waiting": {
						handleWaitingMessage(user, message)
						break
					}

					case "playing": {
						handlePlayingMessage(user, message)
						break
					}
				}
			}
		})
	})
}


function handleLoginMessage(socket: WebSocket, message: ClientToServerMessage): User | null {
	console.info("Handling login message...")
	switch (message.type) {
		case "loginRequest": {
			const user = new User(message.username, socket)
			serverState.addUser(user)
			user.send({
				type: "loginAccepted",
				username: message.username
			})

			return user
		}

		default: {
			const badRequest: BadRequest = {
				type: "badRequest",
				error: `Unsupported message type "${message.type}".`
			}
			socket.send(JSON.stringify(badRequest))
			socket.close()
		}
	}

	return null
}


function handleWaitingMessage(user: User, message: ClientToServerMessage): void {
	switch (message.type) {
		case "setReadyState": {
			user.ready = message.ready
			serverState.broadcast({
				type: "readyStateChange",
				readyStates: serverState.users.reduce<{ [username: string]: boolean }>((readyStates, user) => ({
					...readyStates,
					[user.username]: user.ready
				}), {})
			})

			break
		}

		case "requestGameStart": {
			if (serverState.userCount <= 1) {
				user.send({
					type: "badRequest",
					error: "Not enough players to start."
				})

				return
			}

			for (const userToCheck of serverState.users) {
				if (!userToCheck.ready) {
					user.send({
						type: "badRequest",
						error: `${userToCheck.username} isn't ready.`
					})

					return
				}
			}

			serverState.status = "playing"
			serverState.initGame()
			serverState.sendGameState("gameStart")

			break
		}
	}
}


function handlePlayingMessage(user: User, message: ClientToServerMessage): void {
	switch (message.type) {
		case "playCards": {
			if (user.username !== serverState.currentPlayer) {
				user.send({
					type: "badRequest",
					error: "It's not your turn!"
				})

				break
			}

			if (serverState.board.cards.length > 0 && message.cards.length !== serverState.board.cards.length) {
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

			if (serverState.board.cards.length > 0) {
				const boardRank = serverState.board.cards[0].slice(0, 2)
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

			serverState.board = {
				cards: message.cards,
				lastPlayer: user.username
			}

			if (cardRank === "13") {
				serverState.status = "resolvingRound"
				serverState.sendGameState("roundEnd")
				setTimeout(beginRound, 1000)
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

			if (serverState.board.cards.length === 0) {
				user.send({
					type: "badRequest",
					error: "You can't pass when you're leading. You're welcome."
				})

				break
			}

			user.passed = true
			serverState.nextPlayer()

			const usersRemaining = serverState.users.filter(user => !user.passed && user.hand.length > 0)
			if (usersRemaining.length === 1) {
				serverState.sendGameState("roundEnd")
				setTimeout(beginRound, 1000)
			} else {
				serverState.sendGameState("gameStateChange")
			}

			break
		}
	}
}


function beginRound() {
	serverState.board = {
		cards: [],
		lastPlayer: ""
	}

	serverState.status = "playing"
	serverState.users.forEach(user => { user.passed = false })
	serverState.sendGameState("gameStateChange")
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
