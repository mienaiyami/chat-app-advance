// initialize the socket server at app startup to ensure it's ready for connections
if (typeof window === "undefined") {
	fetch("/api/socket")
		.then((res) => res.json())
		.then((data) => {
			console.log("Socket server status:", data);
		})
		.catch((err) => {
			console.error("Failed to initialize socket server:", err);
		});
}

export {};
