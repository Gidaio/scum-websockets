// Server to client message

type ServerToClientMessage = LoginAccepted | ReadyStateChange | GameStart | GameStateChange | RoundEnd | BadRequest


interface LoginAccepted {
	type: "loginAccepted"
	username: string
}

interface ReadyStateChange {
	type: "readyStateChange"
	readyStates: {
		[username: string]: boolean
	}
}

type GameStart = { type: "gameStart" } & GameState

type GameStateChange = { type: "gameStateChange" } & GameState

type RoundEnd = { type: "roundEnd" } & GameState

interface BadRequest {
	type: "badRequest"
	error: string
}


// Client to server messages

type ClientToServerMessage = LoginRequest | SetReadyState | RequestGameStart | PlayCards | Pass


interface LoginRequest {
	type: "loginRequest"
	username: string
}

interface SetReadyState {
	type: "setReadyState"
	ready: boolean
}

interface RequestGameStart {
	type: "requestGameStart"
}

interface PlayCards {
	type: "playCards"
	cards: string[]
}

interface Pass {
	type: "pass"
}


// Miscellaneous Types

interface GameState {
	players: Player[]
	currentPlayer: string
	lastPlayer: string
	board: string[]
	hand: string[]
}

interface Player {
	username: string
	position: ScumPosition
	passed: boolean
	finished: boolean
}

type ScumPosition = "king" | "queen" | "neutral" | "vice-scum" | "scum"
