import { ServerState } from "./server-state"
import { User } from "./user"

import WebSocket from "ws"


export function handleLoginMessage(socket: WebSocket, message: ClientToServerMessage, serverState: ServerState): User | null {
	console.info("Handling login message...")
	switch (message.type) {
		case "loginRequest": {
			const user = new User(message.username, socket)
			serverState.addUser(user)
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
