const { io } = require("socket.io-client");

console.log("🚀 Testing connection to https://api.emper.fun...");

const socket = io("https://api.emper.fun", {
  transports: ["websocket"],
  reconnection: false,
});

socket.on("connect", () => {
  console.log("✅ CONNECTED SUCCESSFULLY!");
  console.log("Socket ID:", socket.id);
  process.exit(0);
});

socket.on("connect_error", (err) => {
  console.error("❌ CONNECTION FAILED:", err.message);
  // console.error(err);
  process.exit(1);
});

// Timeout after 5 seconds
setTimeout(() => {
  console.error("❌ TIMEOUT: Could not connect within 5 seconds");
  process.exit(1);
}, 5000);
