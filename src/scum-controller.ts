import WebSocket from "ws"


class ServerState {
	public users: User[] = []
	public status: "waiting" | "playing" = "waiting"

	public playerOrder: string[] = []
	public currentPlayerIndex = 0

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


const serverState = new ServerState


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
			serverState.users.forEach(user => {
				user.send({
					type: "gameStart",
					players: serverState.playerOrder,
					hand: user.hand
				})
			})

			break
		}
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
