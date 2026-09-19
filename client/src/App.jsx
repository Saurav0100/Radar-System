import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  const socketRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [angle, setAngle] = useState(0);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:5000");

    socketRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        setAngle(data.angle);
        setDistance(data.distance);
      } catch (error) {
        console.log("Invalid data:", event.data);
      }
    };

    socket.onclose = () => {
      setConnected(false);
    };

    return () => {
      socket.close();
    };
  }, []);

  function sendCommand(command) {
    if (
      socketRef.current &&
      socketRef.current.readyState === WebSocket.OPEN
    ) {
      socketRef.current.send(command);
    }
  }

  const maxDistance = 200;

  const radius = Math.min(distance / maxDistance, 1) * 45;

  const angleRad = (angle * Math.PI) / 180;

  const x = 50 + radius * Math.cos(angleRad);
  const y = 50 - radius * Math.sin(angleRad);

  return (
    <div className="app">

      <header className="header">
        <h1>RADAR SYSTEM</h1>
        <p>Gesture Controlled IoT Dashboard</p>
      </header>

      <main className="dashboard">

        <section className="radar-card">
          <h2>Live Radar</h2>

          <div className="radar">

            <div className="circle circle-1"></div>
            <div className="circle circle-2"></div>
            <div className="circle circle-3"></div>

            <div className="line horizontal"></div>
            <div className="line vertical"></div>

            <div
              className="sweep"
              style={{
                transform: `rotate(${angle}deg)`
              }}
            ></div>

            {distance > 0 && (
              <div
                className="object-point"
                style={{
                  left: `${x}%`,
                  top: `${y}%`
                }}
              ></div>
            )}

            <div className="radar-center"></div>

          </div>
        </section>

        <section className="info-card">

          <div className="info-box">
            <span>Connection</span>
            <strong>
              {connected ? "ONLINE" : "OFFLINE"}
            </strong>
          </div>

          <div className="info-box">
            <span>Angle</span>
            <strong>{angle}°</strong>
          </div>

          <div className="info-box">
            <span>Distance</span>
            <strong>{distance.toFixed(1)} cm</strong>
          </div>

          <div className="info-box">
            <span>Mode</span>
            <strong>LIVE</strong>
          </div>

        </section>

        <section className="controls">

          <button
            className="start"
            onClick={() => sendCommand("START")}
          >
            START
          </button>

          <button
            className="stop"
            onClick={() => sendCommand("STOP")}
          >
            STOP
          </button>

          <button
            onClick={() => sendCommand("AUTO")}
          >
            AUTO
          </button>

          <button
            className="emergency"
            onClick={() => sendCommand("EMERGENCY_STOP")}
          >
            EMERGENCY STOP
          </button>

        </section>

      </main>

    </div>
  );
}

export default App;