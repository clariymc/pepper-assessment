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

function VoiceRecognition({ onResult, onError, isListening, onListeningChange }) {
  const recognitionRef = React.useRef(null)
  
  React.useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-GB'
      
      recognition.onstart = () => {
        console.log('Voice recognition started')
      }
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        console.log('Voice recognition result:', transcript)
        onResult(transcript)
      }
      
      recognition.onerror = (event) => {
        console.error('Voice recognition error:', event.error)
        onError(event.error)
        onListeningChange(false)
      }
      
      recognition.onend = () => {
        console.log('Voice recognition ended')
        onListeningChange(false)
      }
      
      recognitionRef.current = recognition
    }
  }, [onResult, onError, onListeningChange])
  
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start()
        onListeningChange(true)
      } catch (error) {
        console.error('Failed to start voice recognition:', error)
        onError('Failed to start voice recognition')
      }
    }
  }
  
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      onListeningChange(false)
    }
  }
  
  return { startListening, stopListening }
}

function ChatInterface() {
  // Define the conversation flow
  const questions = [
    {
      id: 'living_situation',
      text: "Let's start with some basic information. What is your current living situation? (e.g., live alone, with family, residential care)",
      answered: false
    },
    {
      id: 'mobility',
      text: "How would you describe your mobility? (e.g., fully mobile, walk with aid, wheelchair user)",
      answered: false
    },
    {
      id: 'breathing',
      text: "Do you have any breathing problems or lung conditions? (e.g., asthma, COPD, none)",
      answered: false
    },
    {
      id: 'heart',
      text: "Do you have any heart conditions? (e.g., high blood pressure, heart attack history, none)",
      answered: false
    },
    {
      id: 'medications',
      text: "Are you currently taking any medications? Please list them or say 'none'.",
      answered: false
    }
  ]
  
  const [messages, setMessages] = React.useState([
    { text: "Hi I'm Pepper and I'd like to help complete your preoperative assessment!", isUser: false },
    { text: "I'll guide you through some questions about your health. You can type your answers or use the microphone to speak them. If you want to change a previous answer, just say 'go back'.", isUser: false },
    { text: questions[0].text, isUser: false }
  ])
  
  const [inputValue, setInputValue] = React.useState('')
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)
  const [answers, setAnswers] = React.useState({})
  const [isListening, setIsListening] = React.useState(false)
  const [voiceSupported, setVoiceSupported] = React.useState(true)
  const [voiceError, setVoiceError] = React.useState('')
  
  const messagesEndRef = React.useRef(null)
  
  // Check voice support on component mount
  React.useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceSupported(false)
    }
  }, [])
  
  // Auto-scroll to bottom when new messages are added
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const addMessage = (text, isUser) => {
    setMessages(prev => [...prev, { text, isUser }])
  }
  
  const handleVoiceResult = (transcript) => {
    setInputValue(transcript)
    setIsListening(false)
    // Automatically submit the voice input after a short delay
    setTimeout(() => {
      handleSubmit(null, transcript)
    }, 500)
  }
  
  const handleVoiceError = (error) => {
    setVoiceError(error)
    setIsListening(false)
    setTimeout(() => setVoiceError(''), 3000)
  }
  
  const voiceRecognition = VoiceRecognition({
    onResult: handleVoiceResult,
    onError: handleVoiceError,
    isListening,
    onListeningChange: setIsListening
  })
  
  const goBackToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const newIndex = currentQuestionIndex - 1
      setCurrentQuestionIndex(newIndex)
      
      addMessage("No problem! Let's go back to the previous question.", false)
      setTimeout(() => {
        const previousQuestion = questions[newIndex]
        const previousAnswer = answers[previousQuestion.id]
        
        if (previousAnswer) {
          addMessage(`${previousQuestion.text} (Your previous answer was: "${previousAnswer}")`, false)
        } else {
          addMessage(previousQuestion.text, false)
        }
      }, 1000)
    } else {
      addMessage("We're already at the first question. Let's continue from here!", false)
    }
  }
  
  const moveToNextQuestion = (userAnswer) => {
    // Save the current answer
    const currentQuestion = questions[currentQuestionIndex]
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: userAnswer
    }))
    
    // Move to next question or finish
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1
      setCurrentQuestionIndex(nextIndex)
      
      setTimeout(() => {
        addMessage(`Thank you! I heard: "${userAnswer}". Let's move on.`, false)
        setTimeout(() => {
          addMessage(questions[nextIndex].text, false)
        }, 1000)
      }, 1000)
    } else {
      // Assessment complete
      setTimeout(() => {
        addMessage(`Thank you! I heard: "${userAnswer}". That completes our assessment!`, false)
        setTimeout(() => {
          addMessage("Great! We've covered all the basic questions. In the full version, I'll generate a summary for you to review. For now, you can type or say 'go back' to change any answers.", false)
        }, 1500)
      }, 1000)
    }
  }
  
  const handleSubmit = (e, voiceInput = null) => {
    if (e) e.preventDefault()
    
    const userInput = voiceInput || inputValue
    if (!userInput.trim()) return
    
    const lowerInput = userInput.trim().toLowerCase()
    
    // Add user message
    addMessage(userInput, true)
    
    // Check for go back commands
    if (lowerInput.includes('go back') || 
        lowerInput.includes('previous') || 
        lowerInput.includes('last question') ||
        lowerInput === 'back') {
      goBackToPreviousQuestion()
    } else {
      // Process normal answer
      moveToNextQuestion(userInput)
    }
    
    setInputValue('')
  }
  
  const handleGoBackButton = () => {
    goBackToPreviousQuestion()
  }
  
  const toggleListening = () => {
    if (isListening) {
      voiceRecognition.stopListening()
    } else {
      voiceRecognition.startListening()
    }
  }
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Voice not supported banner */}
      {!voiceSupported && (
        <div style={{
          backgroundColor: '#fef3cd',
          border: '1px solid #facc15',
          padding: '12px 16px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#92400e'
        }}>
          🎤 Voice recognition is not supported in your browser. You can still type your responses.
        </div>
      )}
      
      {/* Voice error banner */}
      {voiceError && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #f87171',
          padding: '12px 16px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#dc2626'
        }}>
          🎤 Voice error: {voiceError}. Please try again or type your response.
        </div>
      )}
      
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
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                Question {currentQuestionIndex + 1} of {questions.length}
                {voiceSupported && ' • Voice enabled 🎤'}
              </p>
            </div>
          </div>
          
          {/* Progress indicator */}
          <div style={{ 
            fontSize: '12px', 
            color: '#6b7280',
            backgroundColor: '#f3f4f6',
            padding: '4px 8px',
            borderRadius: '12px'
          }}>
            {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete
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
        paddingBottom: '140px'
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
            {/* Microphone Button */}
            {voiceSupported && (
              <button
                type="button"
                onClick={toggleListening}
                disabled={isListening}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: isListening ? '#DC2626' : '#003087',
                  color: 'white',
                  cursor: isListening ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transform: isListening ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.2s'
                }}
                title={isListening ? 'Listening... Click to stop' : 'Click to speak'}
              >
                {isListening ? '🔴' : '🎤'}
              </button>
            )}
            
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isListening ? "Listening... Speak now!" : "Type your answer or click the microphone to speak..."}
                disabled={isListening}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '24px',
                  fontSize: '16px',
                  outline: 'none',
                  backgroundColor: isListening ? '#f3f4f6' : 'white'
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
                <span>
                  {voiceSupported 
                    ? (isListening ? "🎤 Listening..." : "Type or speak your answer • Say 'go back' to change previous answers")
                    : "Type your answer • Say 'go back' to change previous answers"
                  }
                </span>
                <button
                  type="button"
                  onClick={handleGoBackButton}
                  disabled={currentQuestionIndex === 0 || isListening}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: (currentQuestionIndex === 0 || isListening) ? '#9ca3af' : '#00A9CE',
                    cursor: (currentQuestionIndex === 0 || isListening) ? 'not-allowed' : 'pointer',
                    fontSize: '12px'
                  }}
                >
                  ← Go back
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={!inputValue.trim() || isListening}
              className="btn btn-primary"
              style={{
                borderRadius: '24px',
                padding: '12px 24px',
                opacity: (inputValue.trim() && !isListening) ? 1 : 0.5,
                cursor: (inputValue.trim() && !isListening) ? 'pointer' : 'not-allowed'
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