import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  const socketRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [angle, setAngle] = useState(0);
  const [distance, setDistance] = useState(0);
  const [detections, setDetections] = useState([]);

  const [totalDetections, setTotalDetections] = useState(0);
  const [averageDistance, setAverageDistance] = useState(0);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:5000");

    socketRef.current = socket;

    fetch("http://localhost:5000/api/stats")
      .then((res) => res.json())
      .then((data) => {
        setTotalDetections(data.totalDetections);
        setAverageDistance(data.averageDistance);
      });

    socket.onopen = () => {
      setConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        setAngle(data.angle);
        setDistance(data.distance);

        setTotalDetections((prev) => prev + 1);
      } catch {
        console.log("Invalid data:", event.data);
      }
    };

    socket.onclose = () => {
      setConnected(false);
    };

    return () => socket.close();
  }, []);

  function sendCommand(command) {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(command);
    }
  }

  const radius = Math.min(distance / 200, 1) * 45;

  const angleRad = (angle * Math.PI) / 180;

  const x = 50 + radius * Math.cos(angleRad);

  const y = 50 - radius * Math.sin(angleRad);

  const minimumDistance =
    detections.length > 0
      ? Math.min(...detections.map((item) => item.distance))
      : 0;

  return (
    <div className="app">
      <header className="header">
        <h1>RADAR SYSTEM</h1>
        <p>Gesture Controlled IoT Monitoring</p>
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
                transform: `rotate(${angle}deg)`,
              }}
            ></div>

            {distance > 0 && distance <= 200 && (
              <div
                className="object-point"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                }}
              ></div>
            )}

            <div className="radar-center"></div>
          </div>
        </section>

        <section className="info-card">
          <div className="info-box">
            <span>Connection</span>
            <strong>{connected ? "ONLINE" : "OFFLINE"}</strong>
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
            <span>Nearest</span>
            <strong>
              {minimumDistance ? `${minimumDistance.toFixed(1)} cm` : "--"}
            </strong>
          </div>

          <div className="info-box">
            <span>Total Detections</span>
            <strong>{totalDetections}</strong>
          </div>

          <div className="info-box">
            <span>Average Distance</span>
            <strong>{averageDistance.toFixed(1)} cm</strong>
          </div>
        </section>

        <section className="controls">
          <button className="start" onClick={() => sendCommand("START")}>
            START
          </button>

          <button className="stop" onClick={() => sendCommand("STOP")}>
            STOP
          </button>

          <button onClick={() => sendCommand("AUTO")}>AUTO</button>

          <button
            className="emergency"
            onClick={() => sendCommand("EMERGENCY_STOP")}
          >
            EMERGENCY STOP
          </button>
        </section>

        <section className="history">
          <h2>Recent Detections</h2>

          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Angle</th>
                <th>Distance</th>
              </tr>
            </thead>

            <tbody>
              {detections.map((item, index) => (
                <tr key={index}>
                  <td>{item.time}</td>
                  <td>{item.angle}°</td>
                  <td>{item.distance.toFixed(1)} cm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}

export default App;
