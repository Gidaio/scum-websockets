// Server to client message

type ServerToClientMessage = LoginAccepted | ReadyStateChange | GameStart | BadRequest


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

interface GameStart {
	type: "gameStart"
}

interface BadRequest {
	type: "badRequest"
	error: string
}


// Client to server messages

type ClientToServerMessage = LoginRequest | SetReadyState | RequestGameStart


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
