// Server to client message

type ServerToClientMessage = LoginAccepted | BadRequest


interface LoginAccepted {
  type: "loginAccepted"
  username: string
}

interface BadRequest {
  type: "badRequest"
  error: string
}


// Client to server messages

type ClientToServerMessage = LoginRequest


interface LoginRequest {
  type: "loginRequest"
  username: string
}
