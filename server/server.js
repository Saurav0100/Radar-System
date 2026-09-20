require("dotenv").config();

const helmet = require("helmet");
const express = require("express");
const http = require("http");
const mqtt = require("mqtt");
const WebSocket = require("ws");
const mongoose = require("mongoose");

const Detection = require("./models/Detection");

const app = express();
app.use(helmet());
app.use(express.json());

const server = http.createServer(app);

const wss = new WebSocket.Server({
  server,
});

// ==========================
// MongoDB
// ==========================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((error) => {
    console.log("MongoDB error:", error.message);
  });

// ==========================
// MQTT
// ==========================

const MQTT_BROKER = "mqtt://broker.hivemq.com:1883";

const DATA_TOPIC = "student/radar/data";

const COMMAND_TOPIC = "student/radar/command";

const mqttClient = mqtt.connect(MQTT_BROKER);

// ==========================
// Express
// ==========================

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Radar System Backend is running!");
});

// Get recent detections
app.get("/api/detections", async (req, res) => {
  const data = await Detection.find().sort({ createdAt: -1 }).limit(20);

  res.json(data);
});

// Basic statistics
app.get("/api/stats", async (req, res) => {
  const data = await Detection.find();

  const distances = data.map((item) => item.distance);

  const averageDistance = distances.length
    ? distances.reduce((a, b) => a + b, 0) / distances.length
    : 0;

  res.json({
    totalDetections: data.length,
    averageDistance,
  });
});

// ==========================
// MQTT Connection
// ==========================

mqttClient.on("connect", () => {
  console.log("Connected to MQTT");

  mqttClient.subscribe(DATA_TOPIC);

  console.log("Subscribed to:", DATA_TOPIC);
});

// ==========================
// MQTT → MongoDB + React
// ==========================

mqttClient.on("message", async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());

    console.log("Radar Data:", data);

    // Save to MongoDB
    await Detection.create({
      angle: data.angle,
      distance: data.distance,
    });

    // Send live data to React
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  } catch (error) {
    console.log("Invalid radar data:", error.message);
  }
});

function isValidCommand(command) {
    if (
        command === "START" ||
        command === "STOP" ||
        command === "AUTO" ||
        command === "EMERGENCY_STOP"
    ) {
        return true;
    }

    if (command.startsWith("SET_ANGLE:")) {
        const angle = Number(
            command.split(":")[1]
        );

        return (
            Number.isInteger(angle) &&
            angle >= 0 &&
            angle <= 180
        );
    }
    return false;
}

// ==========================
// WebSocket
// ==========================

wss.on("connection", (socket) => {
  console.log("React client connected");

socket.on("message", message => {
    const command = message.toString().trim();
    if (!isValidCommand(command)) {
        console.log(
            "Blocked invalid command:",
            command
        );
        return;
    }
    mqttClient.publish(
        COMMAND_TOPIC,
        command
    );
    console.log(
        "Command:",
        command
    );
});

  socket.on("close", () => {
    console.log("React client disconnected");
  });
});

// ==========================
// Start Server
// ==========================

const PORT = 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
