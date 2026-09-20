import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  const socketRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [angle, setAngle] = useState(0);
  const [distance, setDistance] = useState(0);
  const [detections, setDetections] = useState([]);
  const [lastUpdate, setLastUpdate] = useState("--");

  const alertDistance = 30;

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
        setLastUpdate(new Date().toLocaleTimeString());

        if (data.distance > 0 && data.distance <= 200) {
          setDetections((prev) => [
            {
              angle: data.angle,
              distance: data.distance,
              time: new Date().toLocaleTimeString(),
            },
            ...prev,
          ].slice(0, 20));
        }
      } catch {
        console.log("Invalid radar data");
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

  const alertActive =
    distance > 0 && distance <= alertDistance;

  const scanStatus =
    connected ? "ACTIVE" : "OFFLINE";

  const maxDistance = 200;
  const radarRadius = 240;

  function getPoint(item) {
    const r =
      Math.min(item.distance / maxDistance, 1) *
      radarRadius;

    const radians =
      (item.angle * Math.PI) / 180;

    return {
      x: 300 + r * Math.cos(radians),
      y: 280 - r * Math.sin(radians),
    };
  }

  const currentPoint = getPoint({
    angle,
    distance,
  });

  return (
    <div className="app">

      {/* HEADER */}

      <header className="header">

        <div>
          <h1>RADAR SYSTEM</h1>
          <p>Gesture Controlled IoT Monitoring</p>
        </div>

        <div
          className={`system-status ${
            connected ? "online" : "offline"
          }`}
        >
          <span className="status-dot"></span>
          {connected ? "SYSTEM ONLINE" : "SYSTEM OFFLINE"}
        </div>

      </header>


      <main className="dashboard">

        {/* ALERT */}

        <section
          className={`alert-banner ${
            alertActive ? "alert-active" : ""
          }`}
        >

          <span>
            {alertActive
              ? "OBJECT DETECTED"
              : "SYSTEM CLEAR"}
          </span>

          <strong>
            {alertActive
              ? `${distance.toFixed(1)} cm`
              : "No close object detected"}
          </strong>

        </section>


        {/* RADAR */}

        <section className="radar-card">

          <div className="section-title">

            <div>
              <h2>Live Radar</h2>
              <p>Detection range: 200 cm</p>
            </div>

            <div className="scan-status">
              SCAN: {scanStatus}
            </div>

          </div>


          <div className="radar-container">

            <svg
              viewBox="0 0 600 320"
              className="radar-svg"
            >

              {/* Rings */}

              <path
                d="M 60 280 A 240 240 0 0 1 540 280"
                className="radar-ring"
              />

              <path
                d="M 180 280 A 120 120 0 0 1 420 280"
                className="radar-ring"
              />

              <path
                d="M 240 280 A 60 60 0 0 1 360 280"
                className="radar-ring"
              />


              {/* Base */}

              <line
                x1="60"
                y1="280"
                x2="540"
                y2="280"
                className="radar-line"
              />


              {/* Angle lines */}

              <line
                x1="300"
                y1="280"
                x2="60"
                y2="280"
                className="radar-line"
              />

              <line
                x1="300"
                y1="280"
                x2="180"
                y2="72"
                className="radar-line"
              />

              <line
                x1="300"
                y1="280"
                x2="300"
                y2="40"
                className="radar-line"
              />

              <line
                x1="300"
                y1="280"
                x2="420"
                y2="72"
                className="radar-line"
              />

              <line
                x1="300"
                y1="280"
                x2="540"
                y2="280"
                className="radar-line"
              />


              {/* Detection trail */}

              {detections.map((item, index) => {
                const point = getPoint(item);

                return (
                  <circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    className="trail-point"
                    opacity={1 - index / 20}
                  />
                );
              })}


              {/* Current object */}

              {distance > 0 &&
                distance <= maxDistance && (
                  <circle
                    cx={currentPoint.x}
                    cy={currentPoint.y}
                    r={alertActive ? 9 : 7}
                    className={
                      alertActive
                        ? "danger-object"
                        : "current-object"
                    }
                  />
                )}


              {/* Center */}

              <circle
                cx="300"
                cy="280"
                r="7"
                className="radar-center"
              />

            </svg>


            {/* Sweep */}

            <div
              className="radar-sweep"
              style={{
                transform: `rotate(${
                  -90 + angle
                }deg)`,
              }}
            />

          </div>


          <div className="radar-scale">
            <span>0°</span>
            <span>90°</span>
            <span>180°</span>
          </div>

        </section>


        {/* STATUS CARDS */}

        <section className="stats-grid">

          <div className="stat-card">
            <span>CURRENT ANGLE</span>
            <strong>{angle}°</strong>
          </div>

          <div className="stat-card">
            <span>CURRENT DISTANCE</span>
            <strong>
              {distance.toFixed(1)} cm
            </strong>
          </div>

          <div className="stat-card">
            <span>DETECTIONS</span>
            <strong>
              {detections.length}
            </strong>
          </div>

          <div className="stat-card">
            <span>LAST UPDATE</span>
            <strong className="small-value">
              {lastUpdate}
            </strong>
          </div>

        </section>


        {/* CONTROLS */}

        <section className="controls-card">

          <h2>System Controls</h2>

          <div className="controls">

            <button
              onClick={() => sendCommand("START")}
            >
              START
            </button>

            <button
              onClick={() => sendCommand("STOP")}
              className="stop-button"
            >
              STOP
            </button>

            <button
              onClick={() => sendCommand("AUTO")}
            >
              AUTO
            </button>

            <button
              onClick={() =>
                sendCommand("EMERGENCY_STOP")
              }
              className="emergency"
            >
              EMERGENCY STOP
            </button>

          </div>

        </section>


        {/* RECENT DETECTIONS */}

        <section className="history-card">

          <div className="section-title">
            <div>
              <h2>Recent Detections</h2>
              <p>Latest radar readings</p>
            </div>
          </div>

          <div className="table-wrapper">

            <table>

              <thead>
                <tr>
                  <th>TIME</th>
                  <th>ANGLE</th>
                  <th>DISTANCE</th>
                  <th>STATUS</th>
                </tr>
              </thead>

              <tbody>

                {detections.map((item, index) => (
                  <tr key={index}>

                    <td>{item.time}</td>

                    <td>{item.angle}°</td>

                    <td>
                      {item.distance.toFixed(1)} cm
                    </td>

                    <td>
                      <span
                        className={
                          item.distance <= alertDistance
                            ? "danger-text"
                            : "safe-text"
                        }
                      >
                        {item.distance <= alertDistance
                          ? "ALERT"
                          : "CLEAR"}
                      </span>
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>

        </section>

      </main>

    </div>
  );
}

export default App;