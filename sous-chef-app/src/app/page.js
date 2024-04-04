"use client";

import { useState, useEffect, useRef } from "react";
import "./page.css";


const SERVER_URL = "http://localhost:2000";

export default function Home() {
  // Define state variables for the result, recording status, and media recorder
  const [results, setResults] = useState([]);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recipe, setRecipe] = useState("");

  // This array will hold the audio data
  let chunks = [];

  const resultsRef = useRef(results);
  const recipeRef = useRef(recipe);

  useEffect(() => {
    resultsRef.current = results;
  }, [results]);
  useEffect(() => {
    recipeRef.current = recipe;
  }, [recipe]);

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
                const resultsSoFar = resultsRef.current;
                setResults(currentResults => [...currentResults, {
                  role: "user",
                  content: data.text
                }]);

                const textToResponse = await fetch(`${SERVER_URL}/textToResponse`, {
                  method: "POST",
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ text: data.text, recipe: recipeRef.current, conversation: resultsSoFar }),
                });
                const textToResponseData = await textToResponse.json();
                if (textToResponse.status !== 200) {
                  throw textToResponseData.error || new Error(`Request failed with status ${textToResponse.status}`);
                }
                setResults(currentResults => [...currentResults,
                {
                  role: "assistant",
                  content: textToResponseData.text
                }
                ]);
                speakText(textToResponseData.text);
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

  const handleTextChange = (event) => {
    setRecipe(event.target.value);
    console.log(event.target.value);
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      // You can customize the voice, pitch, and rate here
      window.speechSynthesis.speak(utterance);
    } else {
      console.error("This browser does not support text-to-speech.");
    }
  };

  return (
    <main>
      <div className="page">
        <div className="half-column" style={{ borderRight: '3px white solid' }}>
          <div className="history">
            {results.map((result, i) => (
              <div key={i} className={result.role === "user" ? "user-result" : "assistant-result"}>
                {"> " + result.content}
              </div>
            ))}
          </div>
          <div className="button-container">
            <button className={recording ? "active-button" : "inactive-button"} onClick={recording ? stopRecording : startRecording}>
              {recording ? 'Stop Recording' : 'Start Recording'}
            </button>
          </div>
        </div>
        <div className="half-column">
          <textarea
            value={recipe}
            onChange={handleTextChange}
            placeholder="Enter recipe here..."
            className="recipe-textarea"
          >
          </textarea>
        </div>
      </div>
    </main>
  )
}