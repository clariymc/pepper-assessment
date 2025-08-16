import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

function PepperApp() {
  const [hasConsented, setHasConsented] = React.useState(
    localStorage.getItem('pepper-consent') === 'true'
  )
  
  if (!hasConsented) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="card" style={{ maxWidth: '600px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#003087',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              fontSize: '24px'
            }}>
              🛡️
            </div>
            <h1 className="nhs-blue">Pepper Pre-operative Assessment</h1>
            <p style={{ color: '#6b7280' }}>Voice-enabled health assessment system</p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ color: '#003087', marginBottom: '12px' }}>Data Privacy & Consent</h3>
            <ul style={{ lineHeight: '1.6', paddingLeft: '20px' }}>
              <li>We collect health information for your pre-operative assessment</li>
              <li>All data is securely stored with healthcare-grade encryption</li>
              <li>Only authorized healthcare professionals can access your assessment</li>
              <li>Voice recordings are processed locally in your browser</li>
            </ul>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => {
                localStorage.setItem('pepper-consent', 'true')
                setHasConsented(true)
              }}
              className="btn btn-primary"
              style={{ fontSize: '16px', padding: '16px' }}
            >
              I Consent - Continue Assessment
            </button>
            <button
              onClick={() => window.location.href = 'https://nhs.uk'}
              style={{
                padding: '16px',
                border: '1px solid #ccc',
                borderRadius: '8px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container">
      <div className="card">
        <h1 className="nhs-blue">✅ Ready to Begin Assessment</h1>
        <p>You have provided consent. Let's start your pre-operative assessment.</p>
        <div style={{ marginTop: '20px' }}>
          <button className="btn btn-primary">Begin Assessment</button>
          <button 
            onClick={() => {
              localStorage.removeItem('pepper-consent')
              setHasConsented(false)
            }}
            style={{ 
              marginLeft: '10px', 
              padding: '12px 24px', 
              border: '1px solid #ccc', 
              borderRadius: '8px', 
              backgroundColor: 'white', 
              cursor: 'pointer' 
            }}
          >
            Reset (for testing)
          </button>
        </div>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<PepperApp />)