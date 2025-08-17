import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

function ChatBubble({ message, isUser }) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '12px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        maxWidth: '70%',
        flexDirection: isUser ? 'row-reverse' : 'row'
      }}>
        {/* Avatar */}
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: isUser ? '#003087' : '#00A9CE',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          flexShrink: 0
        }}>
          {isUser ? '👤' : '🤖'}
        </div>
        
        {/* Message bubble */}
        <div style={{
          padding: '12px 16px',
          borderRadius: '16px',
          backgroundColor: isUser ? '#003087' : 'white',
          color: isUser ? 'white' : '#333',
          border: isUser ? 'none' : '1px solid #e5e7eb',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          wordWrap: 'break-word'
        }}>
          {message}
        </div>
      </div>
    </div>
  )
}

function ChatInterface() {
  const [messages, setMessages] = React.useState([
    { text: "Hi I'm Pepper and I'd like to help complete your preoperative assessment!", isUser: false },
    { text: "I'll guide you through some questions about your health. You can type your answers or speak them. Let's begin!", isUser: false }
  ])
  const [inputValue, setInputValue] = React.useState('')
  const [currentStep, setCurrentStep] = React.useState('greeting')
  
  const messagesEndRef = React.useRef(null)
  
  // Auto-scroll to bottom when new messages are added
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const addMessage = (text, isUser) => {
    setMessages(prev => [...prev, { text, isUser }])
  }
  
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!inputValue.trim()) return
    
    // Add user message
    addMessage(inputValue, true)
    
    // Simple response logic (we'll make this smarter later)
    setTimeout(() => {
      if (currentStep === 'greeting') {
        addMessage("Great! Let's start with some basic information. What is your current living situation?", false)
        setCurrentStep('living_situation')
      } else if (currentStep === 'living_situation') {
        addMessage(`I heard: "${inputValue}". Thank you. Do you have any breathing problems or lung conditions?`, false)
        setCurrentStep('breathing')
      } else {
        addMessage(`Thank you for that answer. This is where we'll add more questions soon!`, false)
      }
    }, 1000)
    
    setInputValue('')
  }
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '12px 16px'
      }}>
        <div style={{ 
          maxWidth: '768px', 
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#003087',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px'
          }}>
            🤖
          </div>
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '18px', 
              color: '#003087',
              fontWeight: '600'
            }}>
              Pepper Assessment
            </h1>
            <p style={{ 
              margin: 0, 
              fontSize: '14px', 
              color: '#6b7280'
            }}>
              Pre-operative health assessment
            </p>
          </div>
        </div>
      </div>
      
      {/* Chat Messages */}
      <div style={{ 
        flex: 1, 
        maxWidth: '768px', 
        margin: '0 auto',
        width: '100%',
        padding: '20px',
        paddingBottom: '100px'
      }}>
        {messages.map((message, index) => (
          <ChatBubble 
            key={index} 
            message={message.text} 
            isUser={message.isUser}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderTop: '1px solid #e5e7eb',
        padding: '16px'
      }}>
        <div style={{ maxWidth: '768px', margin: '0 auto' }}>
          <form onSubmit={handleSubmit} style={{ 
            display: 'flex', 
            gap: '12px',
            alignItems: 'flex-end'
          }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your answer here..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '24px',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '8px',
                fontSize: '12px',
                color: '#6b7280'
              }}>
                <span>You can type your answer or use voice (coming soon)</span>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00A9CE',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Go back
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="btn btn-primary"
              style={{
                borderRadius: '24px',
                padding: '12px 24px',
                opacity: inputValue.trim() ? 1 : 0.5,
                cursor: inputValue.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

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

          <button
            onClick={() => {
              localStorage.setItem('pepper-consent', 'true')
              setHasConsented(true)
            }}
            className="btn btn-primary"
            style={{ fontSize: '16px', padding: '16px', width: '100%' }}
          >
            I Consent - Continue Assessment
          </button>
        </div>
      </div>
    )
  }
  
  return <ChatInterface />
}

ReactDOM.createRoot(document.getElementById('root')).render(<PepperApp />)