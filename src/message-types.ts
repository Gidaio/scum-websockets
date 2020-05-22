type ClientToServerMessage = LoginRequest

interface LoginRequest {
  type: "loginRequest"
  username: string
}


type ServerToClientMessage = ServerError | LoginAccepted

interface ServerError {
  type: "error"
  message: string
}

interface LoginAccepted {
  type: "loginAccepted"
}
