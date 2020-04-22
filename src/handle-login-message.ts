import { ServerState, addUser } from "./server-state"
import { User, send } from "./user"

import WebSocket from "ws"


export function handleLoginMessage(socket: WebSocket, message: ClientToServerMessage, serverState: ServerState): User | null {
	console.info("Handling login message...")
	switch (message.type) {
		case "loginRequest": {
			const user: User = {
				username: message.username,
				socket,
				ready: false,
				hand: [],
				passed: false,
				position: "neutral"
			}
			addUser(serverState, user)
			send(user, {
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
