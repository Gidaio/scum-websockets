import WebSocket from "ws"


interface ServerState {
  users: User[]
}

class User {
  private _username: string
  private socket: WebSocket

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


const serverState: ServerState = {
  users: []
}


export function scumController(wsServer: WebSocket.Server) {
  wsServer.on("connection", socket => {
    let user: User | null = null

    socket.on("message", data => {
      const message: ClientToServerMessage = JSON.parse(data.toString())

      if (!user) {
        user = handleLoginMessage(socket, message)
        return
      }
    })
  })
}


function handleLoginMessage(socket: WebSocket, message: ClientToServerMessage): User | null {
  console.info("Handling login message...")
  switch (message.type) {
    case "loginRequest": {
      const user = new User(message.username, socket)
      serverState.users.push(user)
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
