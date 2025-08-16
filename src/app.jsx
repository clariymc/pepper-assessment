import React, { useState } from 'react'

function App() {
  const [hasConsented, setHasConsented] = useState(false)
  
  if (!hasConsented) {
    return (
      <div className="container">
        <div className="card">
          <h1 className="nhs-blue">🏥 Pepper Consent</h1>
          <p>Do you consent to the pre-operative assessment?</p>
          <button 
            onClick={() => setHasConsented(true)}
            className="btn btn-primary"
          >
            I Consent
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container">
      <div className="card">
        <h1 className="nhs-blue">✅ Assessment Ready!</h1>
        <p>You have consented. Ready to begin...</p>
      </div>
    </div>
  )
}

export default App