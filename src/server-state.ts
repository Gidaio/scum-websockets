import { User, send } from "./user"


export interface ServerState {
	users: User[]
	status: ServerStatus

	playerOrder: string[]
	currentPlayerIndex: number
	waitingOnTrades: string[]
	finishedPlayers: string[]

	lastPlayer: string
	board: string[]
}

type ServerStatus = "waiting" | "playing" | "resolvingRound" | "trading"

export function players(serverState: ServerState): Player[] {
	return serverState.playerOrder.map(username => {
		const user = serverState.users.find(user => user.username === username)!
		return {
			username,
			position: user.position,
			passed: user.passed,
			finished: user.hand.length === 0
		}
	})
}

export function currentPlayer(serverState: ServerState): string {
	return serverState.playerOrder[serverState.currentPlayerIndex]
}

export function currentUser(serverState: ServerState): User {
	return serverState.users.find(user => user.username === currentPlayer(serverState))!
}

export function userCount(serverState: ServerState): number {
	return Object.keys(serverState.users).length
}

export function addUser(serverState: ServerState, user: User): void {
	serverState.users.push(user)
}

export function initGame(serverState: ServerState): void {
	if (serverState.playerOrder.length === 0) {
		serverState.playerOrder = shuffle(serverState.users.map(user => user.username))
	}
	dealCards(serverState)
}

export function newHand(serverState: ServerState): void {
	dealCards(serverState)

	serverState.board = []
	serverState.lastPlayer = ""
	serverState.finishedPlayers = []

	serverState.status = "trading"

	const king = serverState.users.find(user => user.position === "king")!
	const scum = serverState.users.find(user => user.position === "scum")!
	const scumIndex = players(serverState).findIndex(player => player.username === scum.username)

	serverState.currentPlayerIndex = scumIndex

	const scumCards = scum.hand.sort((a, b) => a < b ? 1 : -1).splice(0, 2)
	king.hand.push(...scumCards)

	send(scum, {
		type: "gameStateChange",
		players: players(serverState),
		currentPlayer: currentPlayer(serverState),
		lastPlayer: serverState.lastPlayer,
		board: serverState.board,
		hand: scum.hand
	})
	send(scum, {
		type: "cardsSent",
		player: king.username,
		cards: scumCards
	})

	send(king, {
		type: "gameStateChange",
		players: players(serverState),
		currentPlayer: currentPlayer(serverState),
		lastPlayer: serverState.lastPlayer,
		board: serverState.board,
		hand: king.hand
	})
	send(king, {
		type: "cardsReceived",
		player: scum.username,
		cards: scumCards
	})

	serverState.waitingOnTrades.push(king.username)

	if (players(serverState).length >= 4) {
		const queen = serverState.users.find(user => user.position === "queen")!
		const viceScum = serverState.users.find(user => user.position === "vice-scum")!

		const scumCards = viceScum.hand.sort((a, b) => a < b ? 1 : -1).splice(0, 1)
		queen.hand.push(...scumCards)

		send(viceScum, {
			type: "gameStateChange",
			players: players(serverState),
			currentPlayer: currentPlayer(serverState),
			lastPlayer: serverState.lastPlayer,
			board: serverState.board,
			hand: viceScum.hand
		})
		send(viceScum, {
			type: "cardsSent",
			player: queen.username,
			cards: scumCards
		})

		send(queen, {
			type: "gameStateChange",
			players: players(serverState),
			currentPlayer: currentPlayer(serverState),
			lastPlayer: serverState.lastPlayer,
			board: serverState.board,
			hand: queen.hand
		})
		send(queen, {
			type: "cardsReceived",
			player: viceScum.username,
			cards: scumCards
		})

		serverState.waitingOnTrades.push(queen.username)
	}
}

function dealCards(serverState: ServerState): void {
	// TODO: Needs to rotate who the deal "starts" with, i.e. who gets more cards.
	let deck = []
	for (let times = 0; times < (Math.ceil(serverState.users.length / 5)); times++) {
		for (const suit of ["C", "D", "H", "S"]) {
			for (let rank = 1; rank <= 13; rank++) {
				deck.push(`${rank.toString().padStart(2, "0")}${suit}`)
			}
		}
	}
	deck = shuffle(deck)

	for (let userIndex = 0; userIndex < serverState.users.length; userIndex++) {
		const usersRemaining = serverState.users.length - userIndex
		const cardsForUser = Math.ceil(deck.length / usersRemaining)
		serverState.users[userIndex].hand = deck.splice(0, cardsForUser)
	}
}

export function nextPlayer(serverState: ServerState): void {
	do {
		serverState.currentPlayerIndex = (serverState.currentPlayerIndex + 1) % serverState.playerOrder.length
	} while (currentPlayer(serverState) !== serverState.lastPlayer && (currentUser(serverState).passed || currentUser(serverState).hand.length === 0))
}

export function newRound(serverState: ServerState): void {
	serverState.board = []
	serverState.lastPlayer = ""
	serverState.status = "playing"
	serverState.users.forEach(user => { user.passed = false })
	if (currentUser(serverState).hand.length === 0) {
		nextPlayer(serverState)
	}
	sendGameState(serverState, "gameStateChange")
}

export function finishedHand(serverState: ServerState, user: User): void {
	serverState.finishedPlayers.push(user.username)

	if (serverState.finishedPlayers.length === 1) {
		const currentKing = serverState.users.find(user => user.position === "king")
		if (currentKing) {
			currentKing.position = "neutral"
		}

		user.position = "king"
	} else if (players(serverState).length >= 4 && serverState.finishedPlayers.length == 2) {
		const currentQueen = serverState.users.find(user => user.position === "queen")
		if (currentQueen) {
			currentQueen.position = "neutral"
		}

		user.position = "queen"
	} else if (players(serverState).length >= 4 && serverState.finishedPlayers.length === players(serverState).length - 1) {
		const currentViceScum = serverState.users.find(user => user.position === "vice-scum")
		if (currentViceScum) {
			currentViceScum.position = "scum"
		}

		user.position = "vice-scum"
	} else if (serverState.finishedPlayers.length === players(serverState).length) {
		user.position = "scum"
	} else {
		user.position = "neutral"
	}
}

export function sendGameState(serverState: ServerState, type: "gameStart" | "gameStateChange" | "roundEnd"): void {
	serverState.users.forEach(user => {
		send(user, {
			type,
			players: players(serverState),
			currentPlayer: currentPlayer(serverState),
			lastPlayer: serverState.lastPlayer,
			board: serverState.board,
			hand: user.hand
		})
	})
}

export function broadcast<T extends ServerToClientMessage>(serverState: ServerState, message: T): void {
	serverState.users.forEach(user => {
		send(user, message)
	})
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
