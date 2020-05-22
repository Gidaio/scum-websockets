import EventEmitter from "events"
import WebSocket from "ws"
import { isUsernameTaken } from "."


export declare interface Connection {
  on(event: "message", listener: (message: ClientToServerMessage) => void): this
  emit(event: "message", ...args: [ClientToServerMessage]): boolean
}

export class Connection extends EventEmitter {
  private socket: WebSocket
  private _username: string = ""

  public get username() {
    return this._username
  }

  public constructor(socket: WebSocket) {
    super()
    this.socket = socket
    this.socket.on("message", this.handleMessage.bind(this))
  }

  private handleMessage(raw: string) {
    try {
      const message: ClientToServerMessage = JSON.parse(raw)

    switch (message.type) {
      case "loginRequest": {
        if (this._username !== "") {
          throw new Error("You're already logged in!")
        }

        if (isUsernameTaken(message.username)) {
          throw new Error("Username is taken.")
        }

        this._username = message.username

        this.send({ type: "loginAccepted" })

        break
      }

      default: {
        this.emit("message", message)
      }
    }
    } catch (error) {
      console.error(JSON.stringify(error))
      this.send({ type: "error", message: error.message })
    }
  }

  private send(message: ServerToClientMessage) {
    if (this.socket.readyState !== WebSocket.OPEN) {
      console.error(`Socket for ${this.username} isn't open!`)
      return
    }

    this.socket.send(JSON.stringify(message))
  }
}
