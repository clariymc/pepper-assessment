import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

function SimpleApp() {
  return (
    <div className="container">
      <div className="card">
        <h1 className="nhs-blue">🏥 Pepper Pre-operative Assessment</h1>
        <p>Voice-enabled health assessment system</p>
        <div style={{ marginTop: '20px' }}>
          <button className="btn btn-primary" style={{ marginRight: '10px' }}>
            Start Assessment
          </button>
          <button className="btn" style={{ backgroundColor: '#6b7280', color: 'white' }}>
            Admin Access
          </button>
        </div>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<SimpleApp />)