import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

function App() {
  return (
    <div className="container">
      <div className="card">
        <h1 className="nhs-blue">🏥 Pepper Pre-operative Assessment</h1>
        <p>Voice-enabled health assessment system</p>
        <button className="btn btn-primary">
          Start Assessment
        </button>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)