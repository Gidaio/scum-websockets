import { scumController } from "./scum-controller"

import express from "express"
import { createServer } from "http"
import WebSocket from "ws"


const app = express()
const server = createServer(app)
const wsServer = new WebSocket.Server({ server })

app.use("/", express.static("html"))
app.use("/", express.static("out/client"))


scumController(wsServer)


server.listen(8000, () => {
	console.info("HTTP listening!")
})

wsServer.on("listening", () => {
	console.info("WebSockets listening!")
})
