import { ServerState } from "./server-state"
import { User } from "./user"


export function handleWaitingMessage(user: User, message: ClientToServerMessage, serverState: ServerState): void {
	switch (message.type) {
		case "setReadyState": {
			user.ready = message.ready
			serverState.broadcast({
				type: "readyStateChange",
				readyStates: serverState.users.reduce<{ [username: string]: boolean }>((readyStates, user) => ({
					...readyStates,
					[user.username]: user.ready
				}), {})
			})

			break
		}

		case "requestGameStart": {
			if (serverState.userCount <= 1) {
				user.send({
					type: "badRequest",
					error: "Not enough players to start."
				})

				return
			}

			for (const userToCheck of serverState.users) {
				if (!userToCheck.ready) {
					user.send({
						type: "badRequest",
						error: `${userToCheck.username} isn't ready.`
					})

					return
				}
			}

			serverState.status = "playing"
			serverState.initGame()
			serverState.sendGameState("gameStart")

			break
		}
	}
}
