let appState: AppState = {
	state: "login"
}


render(appState)


loginForm.addEventListener("submit", event => {
	event.preventDefault()

	console.log("Submitting...")

	let reconnectionToken: string
	const url = new URL(location.toString())
	if (url.searchParams.has("reconnectionToken")) {
		reconnectionToken = url.searchParams.get("reconnectionToken")!
	}

	const username = loginUsernameInput.value
	const socket = new WebSocket(`ws://${location.host}`)

	socket.addEventListener("message", handleSocketMessages)

	socket.addEventListener("close", () => {
		console.warn("Server closed the socket!")
	})

	socket.addEventListener("open", () => {
		console.log("Socket open.")
		const payload: LoginRequest = {
			type: "loginRequest",
			username,
			reconnectionToken
		}

		socket.send(JSON.stringify(payload))
	})
})


function handleSocketMessages(this: WebSocket, event: MessageEvent): void {
	console.log("Got a message!")
	const message: ServerToClientMessage = JSON.parse(event.data)

	switch (message.type) {
		case "loginAccepted": {
			console.log("Login accepted!")

			appState = {
				state: "loggedIn",
				socket: this,
				username: message.username
			}

			const url = new URL(location.toString())
			url.searchParams.set("reconnectionToken", message.reconnectionToken)
			history.replaceState({ reconnectionToken: message.reconnectionToken }, "Scum", url.toString())

			break
		}

		case "loginRejected": {
			console.warn("Login rejected!")
			appState = {
				state: "login",
				loginError: message.reason
			}

			break
		}
	}

	render(appState)
}
