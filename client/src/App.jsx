import { useEffect, useState } from "react";

function App() {

  const [angle, setAngle] = useState(0);
  const [distance, setDistance] = useState(0);
  const [status, setStatus] = useState("Connecting...");

  useEffect(() => {

    const socket = new WebSocket("ws://localhost:5000");

    socket.onopen = () => {
      setStatus("Connected");
    };

    socket.onmessage = (event) => {

      const data = JSON.parse(event.data);

      setAngle(data.angle);
      setDistance(data.distance);
    };

    socket.onclose = () => {
      setStatus("Disconnected");
    };

    return () => {
      socket.close();
    };

  }, []);


  function sendCommand(command) {

    const socket = new WebSocket("ws://localhost:5000");

    socket.onopen = () => {
      socket.send(command);
      socket.close();
    };
  }


  return (
    <div>

      <h1>Radar System</h1>

      <h3>Status: {status}</h3>

      <h2>Angle: {angle}°</h2>

      <h2>Distance: {distance} cm</h2>

      <button onClick={() => sendCommand("START")}>
        START
      </button>

      <button onClick={() => sendCommand("STOP")}>
        STOP
      </button>

      <button onClick={() => sendCommand("SET_ANGLE:90")}>
        90°
      </button>

      <button onClick={() => sendCommand("SET_ANGLE:180")}>
        180°
      </button>

    </div>
  );
}

export default App;