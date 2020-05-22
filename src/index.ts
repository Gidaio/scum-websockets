import { Connection } from "./connection"

import express from "express"
import { createServer } from "http"
import WebSocket from "ws"


const app = express()
const server = createServer(app)
const wsServer = new WebSocket.Server({ server })

app.use("/", express.static("html"))
app.use("/", express.static("out/client"))


const connections: Connection[] = []

export function isUsernameTaken(username: string): boolean {
	for (const connection of connections) {
		if (username === connection.username) {
			return true
		}
	}

	return false
}

wsServer.on("connection", socket => {
	connections.push(new Connection(socket))
})


server.listen(8000, () => {
	console.info("HTTP listening!")
})

wsServer.on("listening", () => {
	console.info("WebSockets listening!")
})
