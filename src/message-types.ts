// Server to client message

type ServerToClientMessage = LoginAccepted | ReadyStateChange | GameStart | GameStateChange | BadRequest


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

interface BadRequest {
	type: "badRequest"
	error: string
}


interface GameState {
	players: string[]
	currentPlayer: string
	board: {
		lastPlayer: string
		cards: string[]
	}
	hand: string[]
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
