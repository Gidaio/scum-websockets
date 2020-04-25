type AppState = StateLogin | StateLoggedIn

interface StateLogin {
  state: "login"
  loginError?: string
}

interface StateLoggedIn {
  state: "loggedIn"
  socket: WebSocket
  username: string
}
