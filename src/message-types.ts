// Server to client message

type ServerToClientMessage =
	LoginAccepted | ReadyStateChange | GameStart |
	GameStateChange | RoundEnd | HandEnd | CardsSent | CardsReceived | HandBegin |
	BadRequest


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

interface GameStart extends GameState { type: "gameStart" }

interface GameStateChange extends GameState { type: "gameStateChange" }

interface RoundEnd extends GameState { type: "roundEnd" }

interface HandEnd {
	type: "handEnd"
}

interface HandBegin {
	type: "handBegin"
}

interface CardsSent {
	type: "cardsSent"
	player: string
	cards: string[]
}

interface CardsReceived {
	type: "cardsReceived"
	player: string
	cards: string[]
}

interface BadRequest {
	type: "badRequest"
	error: string
}


// Client to server messages

type ClientToServerMessage = LoginRequest | SetReadyState | RequestGameStart | PlayCards | Pass | SendCards


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

interface SendCards {
	type: "sendCards"
	cards: string[]
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
