import { useState } from 'react'

function ConsentScreen({ onConsent }) {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
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
          <h1 className="nhs-blue" style={{ marginBottom: '8px' }}>
            Pepper Pre-operative Assessment
          </h1>
          <p style={{ color: '#6b7280' }}>Voice-enabled health assessment system</p>
        </div>

        <div style={{
          borderLeft: '4px solid #00A9CE',
          paddingLeft: '16px',
          marginBottom: '24px'
        }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            marginBottom: '12px' 
          }}>
            Data Collection and Privacy
          </h2>
          
          <div style={{ marginBottom: '12px' }}>
            <span style={{ marginRight: '8px' }}>📄</span>
            <span>We collect your health information to complete your pre-operative assessment</span>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <span style={{ marginRight: '8px' }}>🔒</span>
            <span>All data is securely stored and encrypted using healthcare-grade security</span>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <span style={{ marginRight: '8px' }}>👥</span>
            <span>Only authorized healthcare professionals can access your assessment</span>
          </div>
        </div>

        <div style={{
          backgroundColor: '#eff6ff',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <h3 style={{ 
            fontWeight: '600', 
            color: '#003087', 
            marginBottom: '8px',
            fontSize: '16px'
          }}>
            Your Rights
          </h3>
          <ul style={{ 
            fontSize: '14px', 
            margin: 0,
            paddingLeft: '20px',
            lineHeight: '1.5'
          }}>
            <li>Your data will only be used for your medical care</li>
            <li>No personal information is shared with third parties</li>
            <li>You can request deletion of your data after treatment</li>
            <li>Voice recordings are processed locally in your browser</li>
          </ul>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={onConsent}
            className="btn btn-primary"
            style={{ fontSize: '16px', padding: '16px' }}
          >
            I Consent - Continue Assessment
          </button>
          <button
            onClick={() => window.location.href = 'https://nhs.uk'}
            style={{
              padding: '16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [hasConsented, setHasConsented] = useState(
    localStorage.getItem('pepper-consent') === 'true'
  )
  
  if (!hasConsented) {
    return <ConsentScreen onConsent={() => {
      localStorage.setItem('pepper-consent', 'true')
      setHasConsented(true)
    }} />
  }
  
  return (
    <div className="container">
      <div className="card">
        <h1 className="nhs-blue">✅ Consent Complete!</h1>
        <p>Ready to start your pre-operative assessment...</p>
        <button 
          onClick={() => {
            localStorage.removeItem('pepper-consent')
            window.location.reload()
          }}
          className="btn"
          style={{ backgroundColor: '#6b7280', color: 'white' }}
        >
          Reset (for testing)
        </button>
      </div>
    </div>
  )
}

export default App