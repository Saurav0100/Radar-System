const express = require("express");
const http = require("http");
const mqtt = require("mqtt");
const WebSocket = require("ws");

const app = express();

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });


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

app.get("/", (req, res) => {
    res.send("Radar System Backend is running!");
});


// ==========================
// MQTT Connected
// ==========================

mqttClient.on("connect", () => {

    console.log("Connected to MQTT");

    mqttClient.subscribe(DATA_TOPIC);

    console.log("Subscribed to:", DATA_TOPIC);
});


// ==========================
// MQTT → WebSocket
// ==========================

mqttClient.on("message", (topic, message) => {

    const data = message.toString();

    console.log("Radar Data:", data);

    // Send data to every connected browser
    wss.clients.forEach((client) => {

        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }

    });
});


// ==========================
// WebSocket
// ==========================

wss.on("connection", (socket) => {

    console.log("React client connected");

    socket.on("message", (message) => {

        const command = message.toString();

        console.log("Command:", command);

        mqttClient.publish(
            COMMAND_TOPIC,
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