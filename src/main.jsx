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
  const [conversation, setConversation] = React.useState(null)
  const [questionnaire, setQuestionnaire] = React.useState(null)
  const [messages, setMessages] = React.useState([])
  
  const [inputValue, setInputValue] = React.useState('')
  const [isListening, setIsListening] = React.useState(false)
  const [voiceSupported, setVoiceSupported] = React.useState(true)
  const [voiceError, setVoiceError] = React.useState('')
  const [speechEnabled, setSpeechEnabled] = React.useState(true)
  
  // Consultation state
  const [currentPhase, setCurrentPhase] = React.useState('introduction')
  const [consultationData, setConsultationData] = React.useState({
    anaesthetic_history: '',
    medical_problems: '',
    allergies: '',
    medications: '',
    detailed_answers: {}
  })
  const [detailedQuestionsMode, setDetailedQuestionsMode] = React.useState(false)
  const [currentDetailSection, setCurrentDetailSection] = React.useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)
  const [mdasiScore, setMdasiScore] = React.useState(0)
  
  const messagesEndRef = React.useRef(null)
  
  // Speech synthesis function
  const speakText = React.useCallback((text) => {
    if (!speechEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return Promise.resolve()
    }
    
    return new Promise((resolve) => {
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-GB'
      utterance.rate = 0.8
      utterance.pitch = 1
      
      // Wait for voices to load
      const setVoiceAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices()
        const preferredVoices = [
          voices.find(voice => voice.name.includes('Google UK English Female')),
          voices.find(voice => voice.name.includes('Microsoft Hazel')),
          voices.find(voice => voice.name.includes('Karen')),
          voices.find(voice => voice.lang === 'en-GB' && voice.gender === 'female'),
          voices.find(voice => voice.lang.startsWith('en-GB')),
          voices.find(voice => voice.lang.startsWith('en') && voice.localService)
        ].find(voice => voice)
        
        if (preferredVoices) {
          utterance.voice = preferredVoices
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
  }, [speechEnabled])
  
  // Load conversation and questionnaire data
  React.useEffect(() => {
    Promise.all([
      fetch('/conversation.json').then(res => res.json()),
      fetch('/questionnaire.json').then(res => res.json())
    ])
    .then(([conversationData, questionnaireData]) => {
      setConversation(conversationData)
      setQuestionnaire(questionnaireData)
      
      // Start the consultation
      const introMessage = conversationData.consultation_phases.introduction.prompt
      addMessage(introMessage, false)
      
      // Speak introduction after a delay
      setTimeout(() => {
        speakText(introMessage)
      }, 1000)
    })
    .catch(console.error)
  }, [speakText])
  
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
    await new Promise(resolve => setTimeout(resolve, 500))
    await speakText(text)
  }
  
  const moveToNextPhase = async () => {
    const phases = ['introduction', 'anaesthetic_history', 'medical_problems', 'allergies', 'medications', 'review_and_detail']
    const currentIndex = phases.indexOf(currentPhase)
    
    if (currentIndex < phases.length - 1) {
      const nextPhase = phases[currentIndex + 1]
      setCurrentPhase(nextPhase)
      
      if (nextPhase === 'review_and_detail') {
        await addPepperMessage("Thank you for that information. Let me now ask some specific questions to make sure I have all the details we need for your safe care.")
        setDetailedQuestionsMode(true)
        startDetailedQuestions()
      } else {
        const nextPrompt = conversation.consultation_phases[nextPhase].prompt
        await addPepperMessage(nextPrompt)
      }
    }
  }
  
  const startDetailedQuestions = async () => {
    if (questionnaire && questionnaire.sections.length > 0) {
      const firstSection = questionnaire.sections[0]
      const firstQuestion = firstSection.questions[0]
      await addPepperMessage(`Let's start with some personal information. ${firstQuestion.text}`)
    }
  }
  
  const processDetailedQuestion = async (answer) => {
    const currentSection = questionnaire.sections[currentDetailSection]
    const currentQuestion = currentSection.questions[currentQuestionIndex]
    
    // Save answer
    setConsultationData(prev => ({
      ...prev,
      detailed_answers: {
        ...prev.detailed_answers,
        [currentQuestion.id]: answer
      }
    }))
    
    // Calculate MDASI score if in that section
    if (currentSection.id === 'mdasi_score' && currentQuestion.score) {
      const scoreValue = currentQuestion.score[answer.toLowerCase()] || 0
      setMdasiScore(prev => prev + scoreValue)
    }
    
    // Move to next question
    if (currentQuestionIndex < currentSection.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      const nextQuestion = currentSection.questions[currentQuestionIndex + 1]
      await addPepperMessage(nextQuestion.text)
    } else {
      // Move to next section
      if (currentDetailSection < questionnaire.sections.length - 1) {
        setCurrentDetailSection(prev => prev + 1)
        setCurrentQuestionIndex(0)
        const nextSection = questionnaire.sections[currentDetailSection + 1]
        const nextQuestion = nextSection.questions[0]
        await addPepperMessage(`Now let's talk about ${nextSection.title.toLowerCase()}. ${nextQuestion.text}`)
      } else {
        // Complete assessment
        await addPepperMessage("That completes your pre-operative assessment. Thank you for providing all this important information. Your medical team will review this before your operation.")
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
    
    addMessage(userInput, true)
    
    if (detailedQuestionsMode) {
      await processDetailedQuestion(userInput)
    } else {
      // Save to consultation data based on current phase
      setConsultationData(prev => ({
        ...prev,
        [currentPhase]: userInput
      }))
      
      // Acknowledge and move to next phase
      await addPepperMessage("Thank you for that information.")
      await moveToNextPhase()
    }
    
    setInputValue('')
  }
  
  const toggleListening = () => {
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
  
  if (!conversation || !questionnaire) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
          <div style={{ fontSize: '18px', color: '#6b7280' }}>Preparing your consultation...</div>
        </div>
      </div>
    )
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