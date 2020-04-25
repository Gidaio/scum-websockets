import { GameController } from "./game-controller"
import { LoginError } from "./login-error"

import express from "express"
import { createServer } from "http"
import WebSocket from "ws"


const app = express()
const server = createServer(app)
const wsServer = new WebSocket.Server({ server })

app.use("/", express.static("html"))
app.use("/", express.static("out/client"))


const gameController = new GameController()

wsServer.on("connection", socket => {
	console.info("New connection")

	socket.on("message", function (data) {
		try {
			const message = JSON.parse(data.toString())
			gameController.getUser(this, message)
		} catch (error) {
			if (error instanceof LoginError) {
				const payload: LoginRejected = { type: "loginRejected", reason: error.message }
				socket.send(JSON.stringify(payload))
				socket.close()
			}
		}
	})
})


server.listen(8000, () => {
	console.info("HTTP listening!")
})

wsServer.on("listening", () => {
	console.info("WebSockets listening!")
})
