import { LoginError } from "./login-error"

import { v4 as uuid } from "uuid"
import WebSocket from "ws"


interface User {
	socket: WebSocket
	username: string
	reconnectionToken: string
}


export class GameController {
	private users: User[] = []

	public getUser(socket: WebSocket, message: ClientToServerMessage): User {
		const userBySocket = this.users.find(user => user.socket === socket)
		if (userBySocket) {
			console.info("Got user by socket.")
			return userBySocket
		}

		if (message.type !== "loginRequest") {
			throw new LoginError("No user for that socket.")
		}

		if (message.reconnectionToken) {
			const userByReconnectionToken = this.users.find(user =>
				user.reconnectionToken === message.reconnectionToken &&
				user.username === message.username
			)

			if (userByReconnectionToken) {
				console.info(`Reconnected user ${userByReconnectionToken.username}`)

				const payload: LoginAccepted = {
					type: "loginAccepted",
					username: userByReconnectionToken.username,
					reconnectionToken: userByReconnectionToken.reconnectionToken
				}

				socket.send(JSON.stringify(payload))

				return userByReconnectionToken
			} else {
				throw new LoginError("Bad reconnection token; login again without one.")
			}
		}

		const userByUsername = this.users.find(user => user.username === message.username)
		if (userByUsername) {
			throw new LoginError("Username taken.")
		}

		const newUser: User = {
			socket,
			username: message.username,
			reconnectionToken: uuid()
		}

		this.users.push(newUser)

		const payload: LoginAccepted = {
			type: "loginAccepted",
			username: newUser.username,
			reconnectionToken: newUser.reconnectionToken
		}

		socket.send(JSON.stringify(payload))

		return newUser
	}
}
