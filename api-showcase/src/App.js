import React, { useState } from 'react';
import './App.css';

function App() {
  const [endpoint, setEndpoint] = useState('https://jsonplaceholder.typicode.com/todos/1');
  const [method, setMethod] = useState('GET');
  const [body, setBody] = useState('');
  const [response, setResponse] = useState('');
  const [isError, setIsError] = useState(false);

  const handleRequest = async () => {
    setResponse(''); // Clear previous response
    setIsError(false); // Reset error state
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      if (method !== 'GET' && method !== 'HEAD') {
        options.body = body;
      }

      const res = await fetch(endpoint, options);
      const data = await res.json();

      if (res.ok) {
        setResponse(JSON.stringify(data, null, 2));
      } else {
        setIsError(true);
        setResponse(`Error: ${res.status} ${res.statusText}\n${JSON.stringify(data, null, 2)}`);
      }
    } catch (error) {
      setIsError(true);
      setResponse(`Error: ${error.message}`);
    }
  };

  return (
    <div className="App">
      <h1>API Showcase</h1>
      <div className="input-group">
        <input 
          type="text" 
          placeholder="API Endpoint" 
          value={endpoint} 
          onChange={(e) => setEndpoint(e.target.value)} 
        />
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>
      <div>
        <textarea 
          placeholder="Request Body" 
          value={body} 
          onChange={(e) => setBody(e.target.value)} 
        />
      </div>
      <div>
        <button onClick={handleRequest}>Send Request</button>
      </div>
      <div>
        <h2>Response</h2>
        <pre className={isError ? 'error' : ''}>{response}</pre>
      </div>
    </div>
  );
}

export default App;
