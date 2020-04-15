const socket = new WebSocket(`ws://${location.host}`)

socket.addEventListener("error", (event) => {
	console.error("Error connectiong to WebSocket server!")
})

socket.addEventListener("open", () => {
	console.info("WebSocket connected!")
})
