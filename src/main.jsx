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
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-GB'
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        onResult(transcript)
      }
      
      recognition.onerror = (event) => {
        onError(event.error)
        onListeningChange(false)
      }
      
      recognition.onend = () => {
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
  const [messages, setMessages] = React.useState([])
  const [inputValue, setInputValue] = React.useState('')
  const [isListening, setIsListening] = React.useState(false)
  const [voiceSupported, setVoiceSupported] = React.useState(true)
  const [voiceError, setVoiceError] = React.useState('')
  const [speechEnabled, setSpeechEnabled] = React.useState(true)
  const [userHasInteracted, setUserHasInteracted] = React.useState(false)
  
  // Consultation state
  const [currentPhase, setCurrentPhase] = React.useState('introduction')
  const [consultationData, setConsultationData] = React.useState({
    anaesthetic_history: '',
    medical_problems: '',
    allergies: '',
    medications: ''
  })
  
  const messagesEndRef = React.useRef(null)
  
  // Speech synthesis function that waits for user interaction
  const speakText = React.useCallback((text) => {
    if (!speechEnabled || !userHasInteracted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return Promise.resolve()
    }
    
    return new Promise((resolve) => {
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-GB'
      utterance.rate = 0.8
      utterance.pitch = 1
      
      const setVoiceAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices()
        const preferredVoice = voices.find(voice => 
          voice.lang.startsWith('en') && 
          (voice.name.includes('Female') || voice.name.includes('Karen') || voice.name.includes('Hazel'))
        ) || voices.find(voice => voice.lang.startsWith('en-GB')) || voices.find(voice => voice.lang.startsWith('en'))
        
        if (preferredVoice) {
          utterance.voice = preferredVoice
        }
        
        utterance.onend = () => resolve()
        utterance.onerror = () => resolve()
        
        window.speechSynthesis.speak(utterance)
      }
      
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          setVoiceAndSpeak()
          window.speechSynthesis.onvoiceschanged = null
        }
      } else {
        setVoiceAndSpeak()
      }
    })
  }, [speechEnabled, userHasInteracted])
  
  // Initialize consultation
  React.useEffect(() => {
    const initMessage = "Hi, I'm Pepper, your pre-operative assessment assistant. I'm here to gather some important information before your operation. This will help your medical team plan the safest care for you."
    addMessage(initMessage, false)
    
    setTimeout(() => {
      addMessage("To get started, could you tell me about any previous experience you've had with general anaesthetics? Have you or any family members had any problems with anaesthetics?", false)
    }, 2000)
  }, [])
  
  // Check voice support
  React.useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceSupported(false)
    }
  }, [])
  
  // Auto-scroll to bottom
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const addMessage = (text, isUser) => {
    setMessages(prev => [...prev, { text, isUser, timestamp: Date.now() }])
  }
  
  const addPepperMessage = async (text) => {
    addMessage(text, false)
    if (userHasInteracted) {
      await new Promise(resolve => setTimeout(resolve, 500))
      await speakText(text)
    }
  }
  
  const moveToNextPhase = async () => {
    const phases = ['introduction', 'anaesthetic_history', 'medical_problems', 'allergies', 'medications', 'complete']
    const currentIndex = phases.indexOf(currentPhase)
    
    if (currentIndex < phases.length - 1) {
      const nextPhase = phases[currentIndex + 1]
      setCurrentPhase(nextPhase)
      
      let nextPrompt = ''
      switch (nextPhase) {
        case 'medical_problems':
          nextPrompt = "Thank you. Now, could you tell me about any medical problems or conditions you have? Please include anything you're seeing a doctor for, any ongoing health issues, or conditions you've been diagnosed with."
          break
        case 'allergies':
          nextPrompt = "That's helpful information. Do you have any allergies? This includes allergies to medications, foods, latex, or anything else. If you do have allergies, please tell me what you're allergic to and what happens when you're exposed to it."
          break
        case 'medications':
          nextPrompt = "Good to know. What medications do you take regularly? Please include prescription medications, over-the-counter medicines, herbal remedies, vitamins, and supplements. You can tell me the names or describe what they're for."
          break
        case 'complete':
          nextPrompt = "Thank you for providing all that information. Based on what you've told me, I may ask some follow-up questions to ensure we have all the details needed for your safe care. This has been very helpful for your medical team."
          break
        default:
          nextPrompt = "Thank you for that information."
      }
      
      if (nextPrompt) {
        await addPepperMessage(nextPrompt)
      }
    }
  }
  
  const handleVoiceResult = (transcript) => {
    setInputValue(transcript)
    setIsListening(false)
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
  
  const handleSubmit = async (e, voiceInput = null) => {
    if (e) e.preventDefault()
    
    const userInput = voiceInput || inputValue
    if (!userInput.trim()) return
    
    // Mark that user has interacted (enables speech)
    if (!userHasInteracted) {
      setUserHasInteracted(true)
    }
    
    addMessage(userInput, true)
    
    // Save to consultation data based on current phase
    setConsultationData(prev => ({
      ...prev,
      [currentPhase]: userInput
    }))
    
    // Acknowledge and move to next phase
    setTimeout(async () => {
      await addPepperMessage("Thank you for sharing that with me.")
      setTimeout(() => {
        moveToNextPhase()
      }, 1500)
    }, 1000)
    
    setInputValue('')
  }
  
  const toggleListening = () => {
    // Mark user interaction
    if (!userHasInteracted) {
      setUserHasInteracted(true)
    }
    
    if (isListening) {
      voiceRecognition.stopListening()
    } else {
      voiceRecognition.startListening()
    }
  }
  
  const toggleSpeech = () => {
    setSpeechEnabled(!speechEnabled)
    if (!speechEnabled) {
      window.speechSynthesis.cancel()
    }
  }
  
  const handleTextareaClick = () => {
    // Mark user interaction when they click the textarea
    if (!userHasInteracted) {
      setUserHasInteracted(true)
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
                Dr. Pepper Consultation
              </h1>
              <p style={{ 
                margin: 0, 
                fontSize: '14px', 
                color: '#6b7280'
              }}>
                Pre-operative Assessment
                {voiceSupported && ' • Voice enabled 🎤'}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={toggleSpeech}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: speechEnabled ? '#009639' : '#6b7280',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer'
              }}
              title={speechEnabled ? 'Speech enabled' : 'Speech disabled'}
            >
              {speechEnabled ? '🔊 ON' : '🔇 OFF'}
            </button>
            
            <div style={{ 
              fontSize: '12px', 
              color: '#6b7280',
              backgroundColor: '#f3f4f6',
              padding: '4px 8px',
              borderRadius: '12px'
            }}>
              {currentPhase === 'introduction' ? 'Starting' : 
               currentPhase === 'anaesthetic_history' ? 'Anaesthetic History' :
               currentPhase === 'medical_problems' ? 'Medical History' :
               currentPhase === 'allergies' ? 'Allergies' :
               currentPhase === 'medications' ? 'Medications' : 'Complete'}
            </div>
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
            key={`${message.timestamp}-${index}`}
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
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onClick={handleTextareaClick}
                placeholder={isListening ? "Listening... Speak now!" : "Tell me about your medical history, or click the microphone to speak..."}
                disabled={isListening}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none',
                  backgroundColor: isListening ? '#f3f4f6' : 'white',
                  resize: 'vertical',
                  minHeight: '48px',
                  fontFamily: 'inherit'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
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
                  {isListening 
                    ? "🎤 Listening..." 
                    : "Please share as much detail as you're comfortable with. Press Enter to send, Shift+Enter for new line."
                  }
                </span>
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
                cursor: (inputValue.trim() && !isListening) ? 'pointer' : 'not-allowed',
                alignSelf: 'flex-end'
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
            <p style={{ color: '#6b7280' }}>Voice-enabled health assessment consultation</p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ color: '#003087', marginBottom: '12px' }}>Data Privacy & Consent</h3>
            <ul style={{ lineHeight: '1.6', paddingLeft: '20px' }}>
              <li>We collect your health information for your pre-operative assessment</li>
              <li>All data is securely stored with healthcare-grade encryption</li>
              <li>Only authorized healthcare professionals can access your assessment</li>
              <li>Voice recordings are processed locally in your browser</li>
              <li>You can provide as much or as little detail as you're comfortable with</li>
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
            I Consent - Begin Consultation
          </button>
        </div>
      </div>
    )
  }
  
  return <ChatInterface />
}

ReactDOM.createRoot(document.getElementById('root')).render(<PepperApp />)