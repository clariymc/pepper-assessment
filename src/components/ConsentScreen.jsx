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
        <div style={{
          maxWidth: '512px',
          width: '100%',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          padding: '32px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#003087',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <span style={{ color: 'white', fontSize: '24px' }}>🛡️</span>
            </div>
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: 'bold', 
              color: '#003087', 
              marginBottom: '8px' 
            }}>
              Pepper Pre-operative Assessment
            </h1>
            <p style={{ color: '#6b7280' }}>Voice-enabled health assessment system</p>
          </div>
  
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              borderLeft: '4px solid #00A9CE',
              paddingLeft: '16px',
              marginBottom: '24px'
            }}>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: '#111827', 
                marginBottom: '12px' 
              }}>
                Data Collection and Privacy
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{ color: '#00A9CE', marginTop: '2px' }}>📄</span>
                  <p style={{ color: '#374151', margin: 0 }}>
                    We collect your health information to complete your pre-operative assessment
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{ color: '#009639', marginTop: '2px' }}>🔒</span>
                  <p style={{ color: '#374151', margin: 0 }}>
                    All data is securely stored and encrypted using healthcare-grade security
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{ color: '#003087', marginTop: '2px' }}>👥</span>
                  <p style={{ color: '#374151', margin: 0 }}>
                    Only authorized healthcare professionals can access your assessment
                  </p>
                </div>
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
                marginBottom: '8px' 
              }}>
                Your Rights
              </h3>
              <ul style={{ 
                fontSize: '14px', 
                color: '#374151', 
                margin: 0,
                paddingLeft: '20px' 
              }}>
                <li>Your data will only be used for your medical care</li>
                <li>No personal information is shared with third parties</li>
                <li>You can request deletion of your data after treatment</li>
                <li>Voice recordings are processed locally in your browser</li>
              </ul>
            </div>
  
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px' 
            }}>
              <button
                onClick={onConsent}
                className="nhs-button nhs-button-primary"
                style={{ 
                  fontSize: '18px', 
                  padding: '16px',
                  width: '100%'
                }}
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
                  color: '#374151',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  export default ConsentScreen