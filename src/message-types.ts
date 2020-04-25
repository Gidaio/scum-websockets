// Server to client messages.

type ServerToClientMessage = LoginAccepted | LoginRejected

interface LoginAccepted {
	type: "loginAccepted"
	username: string
	reconnectionToken: string
}

interface LoginRejected {
	type: "loginRejected"
	reason: string
}


// Client to server messages.

type ClientToServerMessage = LoginRequest

interface LoginRequest {
	type: "loginRequest"
	username: string
	reconnectionToken?: string
}
