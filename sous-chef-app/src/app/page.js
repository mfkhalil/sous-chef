"use client";

import { useState, useEffect } from "react";
import "./page.css";


const SERVER_URL = "http://localhost:2000";

export default function Home() {
  // Define state variables for the result, recording status, and media recorder
  const [results, setResults] = useState([]);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  // This array will hold the audio data
  let chunks = [];

  // This useEffect hook sets up the media recorder when the component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const newMediaRecorder = new MediaRecorder(stream);
          newMediaRecorder.onstart = () => {
            chunks = [];
          };
          newMediaRecorder.ondataavailable = e => {
            chunks.push(e.data);
          };
          newMediaRecorder.onstop = async () => {
            const audioBlob = new Blob(chunks, { type: 'audio/webm' });
            try {
              const reader = new FileReader();
              reader.readAsDataURL(audioBlob);
              reader.onloadend = async function () {
                const base64Audio = reader.result.split(',')[1];
                const response = await fetch(`${SERVER_URL}/audioToText`, {
                  method: "POST",
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ base64Audio: base64Audio }),
                });
                const data = await response.json();
                if (response.status !== 200) {
                  throw data.error || new Error(`Request failed with status ${response.status}`);
                }
                setResults(currentResults => [...currentResults, data.text]);
              }
            } catch (error) {
              console.error(error);
              alert(error.message);
            }
          };
          setMediaRecorder(newMediaRecorder);
        })
        .catch(err => console.error('Error accessing microphone:', err));
    }
  }, []);

  const startRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.start();
      setRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  return (
    <main>
      <div className="page">
        <div className="half-column" style={{ borderRight: '1px gray solid' }}>
          <div className="history">
            {results.map((result, i) => (
              <div key={i} className="result">
                {"> " + result}
              </div>
            ))}
          </div>
          <div className="button-container">
            <button className={recording ? "active-button": "inactive-button"} onClick={recording ? stopRecording : startRecording}>
              {recording ? 'Stop Recording' : 'Start Recording'}
            </button>
          </div>
        </div>
        <div className="half-column">
        </div>
      </div>
    </main>
  )
}