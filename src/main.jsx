import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// ... (keep the ChatBubble and VoiceRecognition components the same)

function ChatInterface() {
  const [questionnaire, setQuestionnaire] = React.useState(null)
  const [allQuestions, setAllQuestions] = React.useState([])
  const [messages, setMessages] = React.useState([
    { text: "Hi I'm Pepper and I'd like to help complete your preoperative assessment!", isUser: false },
    { text: "I'll guide you through questions about your health. You can type your answers or use the microphone to speak them. If you want to change a previous answer, just say 'go back'.", isUser: false }
  ])
  
  const [inputValue, setInputValue] = React.useState('')
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)
  const [answers, setAnswers] = React.useState({})
  const [isListening, setIsListening] = React.useState(false)
  const [voiceSupported, setVoiceSupported] = React.useState(true)
  const [voiceError, setVoiceError] = React.useState('')
  const [attemptCount, setAttemptCount] = React.useState(0)
  
  // New state for follow-up questions
  const [inFollowUp, setInFollowUp] = React.useState(false)
  const [followUpQuestions, setFollowUpQuestions] = React.useState([])
  const [currentFollowUpIndex, setCurrentFollowUpIndex] = React.useState(0)
  const [detectedConditions, setDetectedConditions] = React.useState([])
  const [followUpAnswers, setFollowUpAnswers] = React.useState({})
  
  // New state for speech synthesis
  const [speechEnabled, setSpeechEnabled] = React.useState(true)
  const [hasSpokenGreeting, setHasSpokenGreeting] = React.useState(false)
  
  const messagesEndRef = React.useRef(null)
  
  // Speech synthesis function
  const speakText = (text) => {
    if (!speechEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel()
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-GB'
    utterance.rate = 0.9
    utterance.pitch = 1
    
    // Find a suitable English voice
    const voices = window.speechSynthesis.getVoices()
    const englishVoice = voices.find(voice => 
      voice.lang.startsWith('en') && (voice.localService || voice.default)
    )
    if (englishVoice) {
      utterance.voice = englishVoice
    }
    
    window.speechSynthesis.speak(utterance)
  }
  
  // Load questionnaire from JSON
  React.useEffect(() => {
    fetch('/questionnaire.json')
      .then(response => response.json())
      .then(data => {
        setQuestionnaire(data)
        // Flatten all questions from all sections
        const questions = data.sections.flatMap(section => 
          section.questions.map(question => ({
            ...question,
            sectionTitle: section.title,
            sectionIcon: section.icon
          }))
        )
        setAllQuestions(questions)
        
        // Add first question to messages and speak greeting
        if (questions.length > 0) {
          setTimeout(() => {
            addMessage(questions[0].text, false)
            
            // Speak the greeting and first question automatically
            if (!hasSpokenGreeting) {
              setTimeout(() => {
                speakText("Hi I'm Pepper and I'd like to help complete your preoperative assessment!")
                setTimeout(() => {
                  speakText("I'll guide you through questions about your health. You can type your answers or use the microphone to speak them.")
                  setTimeout(() => {
                    speakText(questions[0].text)
                  }, 4000)
                }, 4000)
              }, 1000)
              setHasSpokenGreeting(true)
            }
          }, 1000)
        }
      })
      .catch(error => {
        console.error('Failed to load questionnaire:', error)
        addMessage("Sorry, I'm having trouble loading the questionnaire. Please refresh the page.", false)
      })
  }, [hasSpokenGreeting])
  
  // Check voice support on component mount
  React.useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceSupported(false)
    }
    
    // Load voices for speech synthesis
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        window.speechSynthesis.getVoices()
      }
      loadVoices()
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  }, [])
  
  // Auto-scroll to bottom when new messages are added
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const addMessage = (text, isUser, shouldSpeak = false) => {
    setMessages(prev => [...prev, { text, isUser }])
    
    // Speak Pepper's messages automatically
    if (!isUser && shouldSpeak && speechEnabled) {
      setTimeout(() => {
        speakText(text)
      }, 500)
    }
  }
  
  const getCurrentQuestion = () => {
    return allQuestions[currentQuestionIndex]
  }
  
  const validateAnswer = (answer, question) => {
    if (!answer || answer.trim() === '') {
      return false
    }
    
    const lowerAnswer = answer.toLowerCase().trim()
    const expectedOptions = question.expectedOptions || []
    
    return expectedOptions.some(option => 
      lowerAnswer.includes(option.toLowerCase()) ||
      option.toLowerCase().includes(lowerAnswer)
    )
  }
  
  // New function to detect medical conditions in the answer
  const detectConditions = (answer, question) => {
    if (!question.hasFollowUp || !question.followUpTriggers) {
      return []
    }
    
    const lowerAnswer = answer.toLowerCase()
    const detected = question.followUpTriggers.filter(condition => 
      lowerAnswer.includes(condition.toLowerCase())
    )
    
    return detected
  }
  
  const startFollowUpQuestions = (conditions, question) => {
    setDetectedConditions(conditions)
    setInFollowUp(true)
    setCurrentFollowUpIndex(0)
    
    // Create personalized follow-up questions
    const personalizedQuestions = question.followUpQuestions.map(q => 
      q.replace('[CONDITION]', conditions[0]) // Start with first condition
    )
    setFollowUpQuestions(personalizedQuestions)
    
    // Ask the first follow-up question
    setTimeout(() => {
      const followUpMessage = `I can see you mentioned ${conditions.join(' and ')}. Let me ask a few more questions about this.`
      addMessage(followUpMessage, false, true)
      setTimeout(() => {
        addMessage(personalizedQuestions[0], false, true)
      }, 3000)
    }, 1000)
  }
  
  const handleFollowUpComplete = () => {
    setInFollowUp(false)
    setFollowUpQuestions([])
    setCurrentFollowUpIndex(0)
    setDetectedConditions([])
    
    const completionMessage = "Thank you for those details. Let's continue with the next question."
    addMessage(completionMessage, false, true)
    
    // Move to next main question
    setTimeout(() => {
      moveToNextMainQuestion()
    }, 2000)
  }
  
  const moveToNextMainQuestion = () => {
    if (currentQuestionIndex < allQuestions.length - 1) {
      const nextIndex = currentQuestionIndex + 1
      setCurrentQuestionIndex(nextIndex)
      
      const currentSection = allQuestions[currentQuestionIndex].sectionTitle
      const nextSection = allQuestions[nextIndex].sectionTitle
      
      setTimeout(() => {
        if (currentSection !== nextSection) {
          const sectionMessage = `Now let's move on to questions about: ${nextSection}`
          addMessage(sectionMessage, false, true)
          setTimeout(() => {
            addMessage(allQuestions[nextIndex].text, false, true)
          }, 3000)
        } else {
          addMessage(allQuestions[nextIndex].text, false, true)
        }
      }, 500)
    } else {
      // Assessment complete
      setTimeout(() => {
        const completionMessage = "That completes our comprehensive assessment! In the full version, I'll now generate a summary for you to review and confirm."
        addMessage(completionMessage, false, true)
      }, 1000)
    }
  }
  
  const moveToNextQuestion = (userAnswer) => {
    const currentQuestion = getCurrentQuestion()
    
    // Save the current answer
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: userAnswer
    }))
    
    setAttemptCount(0)
    
    // Check if this answer triggers follow-up questions
    const conditions = detectConditions(userAnswer, currentQuestion)
    
    if (conditions.length > 0) {
      // Start follow-up questions
      startFollowUpQuestions(conditions, currentQuestion)
    } else {
      // No follow-up needed, move to next question
      const acknowledgment = `Thank you! I heard: "${userAnswer}". Let's move on.`
      addMessage(acknowledgment, false, true)
      setTimeout(() => {
        moveToNextMainQuestion()
      }, 2000)
    }
  }
  
  const handleFollowUpAnswer = (userAnswer) => {
    // Save follow-up answer
    const currentQuestion = getCurrentQuestion()
    const followUpKey = `${currentQuestion.id}_followup_${currentFollowUpIndex}`
    
    setFollowUpAnswers(prev => ({
      ...prev,
      [followUpKey]: userAnswer
    }))
    
    addMessage(`Thank you for that information.`, false, true)
    
    // Check if there are more follow-up questions
    if (currentFollowUpIndex < followUpQuestions.length - 1) {
      setCurrentFollowUpIndex(prev => prev + 1)
      setTimeout(() => {
        addMessage(followUpQuestions[currentFollowUpIndex + 1], false, true)
      }, 2000)
    } else {
      // Ask if they want to add more information
      setTimeout(() => {
        const completionQuestion = "Have you finished describing your condition, or is there anything else you'd like to tell me about it?"
        addMessage(completionQuestion, false, true)
      }, 2000)
      setCurrentFollowUpIndex(-1) // Flag for "anything else" question
    }
  }
  
  const goBackToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const newIndex = currentQuestionIndex - 1
      setCurrentQuestionIndex(newIndex)
      setAttemptCount(0) // Reset attempt count
      
      addMessage("No problem! Let's go back to the previous question.", false, true)
      setTimeout(() => {
        const previousQuestion = allQuestions[newIndex]
        const previousAnswer = answers[previousQuestion.id]
        
        const questionText = previousAnswer 
          ? `${previousQuestion.text} (Your previous answer was: "${previousAnswer}")`
          : previousQuestion.text
          
        addMessage(questionText, false, true)
      }, 2000)
    } else {
      addMessage("We're already at the first question. Let's continue from here!", false, true)
    }
  }
  
  // Keep all the existing voice recognition functions...
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
      setInputValue('')
      return
    }
    
    // Check for "don't know" or "prefer not to answer"
    if (lowerInput.includes("don't know") || 
        lowerInput.includes("not sure") ||
        lowerInput.includes("prefer not") ||
        lowerInput.includes("rather not")) {
      addMessage("I understand. Let's move on to the next question.", false, true)
      
      if (inFollowUp) {
        setTimeout(() => {
          handleFollowUpComplete()
        }, 2000)
      } else {
        setTimeout(() => {
          moveToNextQuestion(userInput)
        }, 2000)
      }
      setInputValue('')
      return
    }
    
    // Handle follow-up questions
    if (inFollowUp) {
      if (currentFollowUpIndex === -1) {
        // This is the "anything else" question
        if (lowerInput.includes('no') || lowerInput.includes('nothing') || 
            lowerInput.includes('finished') || lowerInput.includes('done')) {
          handleFollowUpComplete()
        } else {
          // They want to add more information
          const followUpKey = `${getCurrentQuestion().id}_additional_info`
          setFollowUpAnswers(prev => ({
            ...prev,
            [followUpKey]: userInput
          }))
          addMessage("Thank you for that additional information.", false, true)
          setTimeout(() => {
            handleFollowUpComplete()
          }, 2000)
        }
      } else {
        handleFollowUpAnswer(userInput)
      }
      setInputValue('')
      return
    }
    
    const currentQuestion = getCurrentQuestion()
    
    // Validate the answer for main questions
    if (currentQuestion && !validateAnswer(userInput, currentQuestion)) {
      if (attemptCount === 0) {
        // First attempt failed - provide clarification ONLY
        setTimeout(() => {
          addMessage(currentQuestion.clarification, false, true)
        }, 1000)
        setAttemptCount(1)
      } else if (attemptCount === 1) {
        // Second attempt failed - accept any text as fallback
        addMessage("Thank you for that information.", false, true)
        setTimeout(() => {
          moveToNextQuestion(userInput)
        }, 2000)
        setAttemptCount(0)
      }
    } else {
      // Answer is valid - move on
      moveToNextQuestion(userInput)
      setAttemptCount(0)
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
  
  const toggleSpeech = () => {
    setSpeechEnabled(!speechEnabled)
    if (!speechEnabled) {
      window.speechSynthesis.cancel()
    }
  }
  
  // Keep the rest of your render method the same, but add a speech toggle button in the header...
  
  if (!questionnaire || allQuestions.length === 0) {
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
          <div style={{ fontSize: '18px', color: '#6b7280' }}>Loading questionnaire...</div>
        </div>
      </div>
    )
  }
  
  const currentQuestion = getCurrentQuestion()
  
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
                Question {currentQuestionIndex + 1} of {allQuestions.length}
                {voiceSupported && ' • Voice enabled 🎤'}
              </p>
            </div>
          </div>
          
          {/* Progress, section indicator, and speech toggle */}
          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              title={speechEnabled ? 'Speech enabled - click to disable' : 'Speech disabled - click to enable'}
            >
              {speechEnabled ? '🔊 ON' : '🔇 OFF'}
            </button>
            
            <div>
              <div style={{ 
                fontSize: '12px', 
                color: '#6b7280',
                backgroundColor: '#f3f4f6',
                padding: '4px 8px',
                borderRadius: '12px',
                marginBottom: '4px'
              }}>
                {Math.round(((currentQuestionIndex + 1) / allQuestions.length) * 100)}% Complete
              </div>
              {currentQuestion && (
                <div style={{ 
                  fontSize: '10px', 
                  color: '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>{currentQuestion.sectionIcon}</span>
                  <span>{currentQuestion.sectionTitle}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Keep the rest of your render method exactly the same... */}
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
      
      {/* Input Area - keep exactly the same as before */}
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
                  {currentQuestion && currentQuestion.expectedOptions && (
                    `Expected: ${currentQuestion.expectedOptions.slice(0, 3).join(', ')}${currentQuestion.expectedOptions.length > 3 ? '...' : ''} • Say 'go back' to change previous answers`
                  )}
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
}function ChatInterface() {
  const [questionnaire, setQuestionnaire] = React.useState(null)
  const [allQuestions, setAllQuestions] = React.useState([])
  const [messages, setMessages] = React.useState([
    { text: "Hi I'm Pepper and I'd like to help complete your preoperative assessment!", isUser: false },
    { text: "I'll guide you through questions about your health. You can type your answers or use the microphone to speak them. If you want to change a previous answer, just say 'go back'.", isUser: false }
  ])
  
  const [inputValue, setInputValue] = React.useState('')
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)
  const [answers, setAnswers] = React.useState({})
  const [isListening, setIsListening] = React.useState(false)
  const [voiceSupported, setVoiceSupported] = React.useState(true)
  const [voiceError, setVoiceError] = React.useState('')
  const [attemptCount, setAttemptCount] = React.useState(0)
  
  // New state for follow-up questions
  const [inFollowUp, setInFollowUp] = React.useState(false)
  const [followUpQuestions, setFollowUpQuestions] = React.useState([])
  const [currentFollowUpIndex, setCurrentFollowUpIndex] = React.useState(0)
  const [detectedConditions, setDetectedConditions] = React.useState([])
  const [followUpAnswers, setFollowUpAnswers] = React.useState({})
  
  // New state for speech synthesis
  const [speechEnabled, setSpeechEnabled] = React.useState(true)
  const [hasSpokenGreeting, setHasSpokenGreeting] = React.useState(false)
  
  const messagesEndRef = React.useRef(null)
  
  // Speech synthesis function
  const speakText = (text) => {
    if (!speechEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel()
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-GB'
    utterance.rate = 0.9
    utterance.pitch = 1
    
    // Find a suitable English voice
    const voices = window.speechSynthesis.getVoices()
    const englishVoice = voices.find(voice => 
      voice.lang.startsWith('en') && (voice.localService || voice.default)
    )
    if (englishVoice) {
      utterance.voice = englishVoice
    }
    
    window.speechSynthesis.speak(utterance)
  }
  
  // Load questionnaire from JSON
  React.useEffect(() => {
    fetch('/questionnaire.json')
      .then(response => response.json())
      .then(data => {
        setQuestionnaire(data)
        // Flatten all questions from all sections
        const questions = data.sections.flatMap(section => 
          section.questions.map(question => ({
            ...question,
            sectionTitle: section.title,
            sectionIcon: section.icon
          }))
        )
        setAllQuestions(questions)
        
        // Add first question to messages and speak greeting
        if (questions.length > 0) {
          setTimeout(() => {
            addMessage(questions[0].text, false)
            
            // Speak the greeting and first question automatically
            if (!hasSpokenGreeting) {
              setTimeout(() => {
                speakText("Hi I'm Pepper and I'd like to help complete your preoperative assessment!")
                setTimeout(() => {
                  speakText("I'll guide you through questions about your health. You can type your answers or use the microphone to speak them.")
                  setTimeout(() => {
                    speakText(questions[0].text)
                  }, 4000)
                }, 4000)
              }, 1000)
              setHasSpokenGreeting(true)
            }
          }, 1000)
        }
      })
      .catch(error => {
        console.error('Failed to load questionnaire:', error)
        addMessage("Sorry, I'm having trouble loading the questionnaire. Please refresh the page.", false)
      })
  }, [hasSpokenGreeting])
  
  // Check voice support on component mount
  React.useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceSupported(false)
    }
    
    // Load voices for speech synthesis
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        window.speechSynthesis.getVoices()
      }
      loadVoices()
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  }, [])
  
  // Auto-scroll to bottom when new messages are added
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const addMessage = (text, isUser, shouldSpeak = false) => {
    setMessages(prev => [...prev, { text, isUser }])
    
    // Speak Pepper's messages automatically
    if (!isUser && shouldSpeak && speechEnabled) {
      setTimeout(() => {
        speakText(text)
      }, 500)
    }
  }
  
  const getCurrentQuestion = () => {
    return allQuestions[currentQuestionIndex]
  }
  
  const validateAnswer = (answer, question) => {
    if (!answer || answer.trim() === '') {
      return false
    }
    
    const lowerAnswer = answer.toLowerCase().trim()
    const expectedOptions = question.expectedOptions || []
    
    return expectedOptions.some(option => 
      lowerAnswer.includes(option.toLowerCase()) ||
      option.toLowerCase().includes(lowerAnswer)
    )
  }
  
  // New function to detect medical conditions in the answer
  const detectConditions = (answer, question) => {
    if (!question.hasFollowUp || !question.followUpTriggers) {
      return []
    }
    
    const lowerAnswer = answer.toLowerCase()
    const detected = question.followUpTriggers.filter(condition => 
      lowerAnswer.includes(condition.toLowerCase())
    )
    
    return detected
  }
  
  const startFollowUpQuestions = (conditions, question) => {
    setDetectedConditions(conditions)
    setInFollowUp(true)
    setCurrentFollowUpIndex(0)
    
    // Create personalized follow-up questions
    const personalizedQuestions = question.followUpQuestions.map(q => 
      q.replace('[CONDITION]', conditions[0]) // Start with first condition
    )
    setFollowUpQuestions(personalizedQuestions)
    
    // Ask the first follow-up question
    setTimeout(() => {
      const followUpMessage = `I can see you mentioned ${conditions.join(' and ')}. Let me ask a few more questions about this.`
      addMessage(followUpMessage, false, true)
      setTimeout(() => {
        addMessage(personalizedQuestions[0], false, true)
      }, 3000)
    }, 1000)
  }
  
  const handleFollowUpComplete = () => {
    setInFollowUp(false)
    setFollowUpQuestions([])
    setCurrentFollowUpIndex(0)
    setDetectedConditions([])
    
    const completionMessage = "Thank you for those details. Let's continue with the next question."
    addMessage(completionMessage, false, true)
    
    // Move to next main question
    setTimeout(() => {
      moveToNextMainQuestion()
    }, 2000)
  }
  
  const moveToNextMainQuestion = () => {
    if (currentQuestionIndex < allQuestions.length - 1) {
      const nextIndex = currentQuestionIndex + 1
      setCurrentQuestionIndex(nextIndex)
      
      const currentSection = allQuestions[currentQuestionIndex].sectionTitle
      const nextSection = allQuestions[nextIndex].sectionTitle
      
      setTimeout(() => {
        if (currentSection !== nextSection) {
          const sectionMessage = `Now let's move on to questions about: ${nextSection}`
          addMessage(sectionMessage, false, true)
          setTimeout(() => {
            addMessage(allQuestions[nextIndex].text, false, true)
          }, 3000)
        } else {
          addMessage(allQuestions[nextIndex].text, false, true)
        }
      }, 500)
    } else {
      // Assessment complete
      setTimeout(() => {
        const completionMessage = "That completes our comprehensive assessment! In the full version, I'll now generate a summary for you to review and confirm."
        addMessage(completionMessage, false, true)
      }, 1000)
    }
  }
  
  const moveToNextQuestion = (userAnswer) => {
    const currentQuestion = getCurrentQuestion()
    
    // Save the current answer
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: userAnswer
    }))
    
    setAttemptCount(0)
    
    // Check if this answer triggers follow-up questions
    const conditions = detectConditions(userAnswer, currentQuestion)
    
    if (conditions.length > 0) {
      // Start follow-up questions
      startFollowUpQuestions(conditions, currentQuestion)
    } else {
      // No follow-up needed, move to next question
      const acknowledgment = `Thank you! I heard: "${userAnswer}". Let's move on.`
      addMessage(acknowledgment, false, true)
      setTimeout(() => {
        moveToNextMainQuestion()
      }, 2000)
    }
  }
  
  const handleFollowUpAnswer = (userAnswer) => {
    // Save follow-up answer
    const currentQuestion = getCurrentQuestion()
    const followUpKey = `${currentQuestion.id}_followup_${currentFollowUpIndex}`
    
    setFollowUpAnswers(prev => ({
      ...prev,
      [followUpKey]: userAnswer
    }))
    
    addMessage(`Thank you for that information.`, false, true)
    
    // Check if there are more follow-up questions
    if (currentFollowUpIndex < followUpQuestions.length - 1) {
      setCurrentFollowUpIndex(prev => prev + 1)
      setTimeout(() => {
        addMessage(followUpQuestions[currentFollowUpIndex + 1], false, true)
      }, 2000)
    } else {
      // Ask if they want to add more information
      setTimeout(() => {
        const completionQuestion = "Have you finished describing your condition, or is there anything else you'd like to tell me about it?"
        addMessage(completionQuestion, false, true)
      }, 2000)
      setCurrentFollowUpIndex(-1) // Flag for "anything else" question
    }
  }
  
  const goBackToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const newIndex = currentQuestionIndex - 1
      setCurrentQuestionIndex(newIndex)
      setAttemptCount(0) // Reset attempt count
      
      addMessage("No problem! Let's go back to the previous question.", false, true)
      setTimeout(() => {
        const previousQuestion = allQuestions[newIndex]
        const previousAnswer = answers[previousQuestion.id]
        
        const questionText = previousAnswer 
          ? `${previousQuestion.text} (Your previous answer was: "${previousAnswer}")`
          : previousQuestion.text
          
        addMessage(questionText, false, true)
      }, 2000)
    } else {
      addMessage("We're already at the first question. Let's continue from here!", false, true)
    }
  }
  
  // Keep all the existing voice recognition functions...
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
      setInputValue('')
      return
    }
    
    // Check for "don't know" or "prefer not to answer"
    if (lowerInput.includes("don't know") || 
        lowerInput.includes("not sure") ||
        lowerInput.includes("prefer not") ||
        lowerInput.includes("rather not")) {
      addMessage("I understand. Let's move on to the next question.", false, true)
      
      if (inFollowUp) {
        setTimeout(() => {
          handleFollowUpComplete()
        }, 2000)
      } else {
        setTimeout(() => {
          moveToNextQuestion(userInput)
        }, 2000)
      }
      setInputValue('')
      return
    }
    
    // Handle follow-up questions
    if (inFollowUp) {
      if (currentFollowUpIndex === -1) {
        // This is the "anything else" question
        if (lowerInput.includes('no') || lowerInput.includes('nothing') || 
            lowerInput.includes('finished') || lowerInput.includes('done')) {
          handleFollowUpComplete()
        } else {
          // They want to add more information
          const followUpKey = `${getCurrentQuestion().id}_additional_info`
          setFollowUpAnswers(prev => ({
            ...prev,
            [followUpKey]: userInput
          }))
          addMessage("Thank you for that additional information.", false, true)
          setTimeout(() => {
            handleFollowUpComplete()
          }, 2000)
        }
      } else {
        handleFollowUpAnswer(userInput)
      }
      setInputValue('')
      return
    }
    
    const currentQuestion = getCurrentQuestion()
    
    // Validate the answer for main questions
    if (currentQuestion && !validateAnswer(userInput, currentQuestion)) {
      if (attemptCount === 0) {
        // First attempt failed - provide clarification ONLY
        setTimeout(() => {
          addMessage(currentQuestion.clarification, false, true)
        }, 1000)
        setAttemptCount(1)
      } else if (attemptCount === 1) {
        // Second attempt failed - accept any text as fallback
        addMessage("Thank you for that information.", false, true)
        setTimeout(() => {
          moveToNextQuestion(userInput)
        }, 2000)
        setAttemptCount(0)
      }
    } else {
      // Answer is valid - move on
      moveToNextQuestion(userInput)
      setAttemptCount(0)
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
  
  const toggleSpeech = () => {
    setSpeechEnabled(!speechEnabled)
    if (!speechEnabled) {
      window.speechSynthesis.cancel()
    }
  }
  
  // Keep the rest of your render method the same, but add a speech toggle button in the header...
  
  if (!questionnaire || allQuestions.length === 0) {
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
          <div style={{ fontSize: '18px', color: '#6b7280' }}>Loading questionnaire...</div>
        </div>
      </div>
    )
  }
  
  const currentQuestion = getCurrentQuestion()
  
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
                Question {currentQuestionIndex + 1} of {allQuestions.length}
                {voiceSupported && ' • Voice enabled 🎤'}
              </p>
            </div>
          </div>
          
          {/* Progress, section indicator, and speech toggle */}
          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              title={speechEnabled ? 'Speech enabled - click to disable' : 'Speech disabled - click to enable'}
            >
              {speechEnabled ? '🔊 ON' : '🔇 OFF'}
            </button>
            
            <div>
              <div style={{ 
                fontSize: '12px', 
                color: '#6b7280',
                backgroundColor: '#f3f4f6',
                padding: '4px 8px',
                borderRadius: '12px',
                marginBottom: '4px'
              }}>
                {Math.round(((currentQuestionIndex + 1) / allQuestions.length) * 100)}% Complete
              </div>
              {currentQuestion && (
                <div style={{ 
                  fontSize: '10px', 
                  color: '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>{currentQuestion.sectionIcon}</span>
                  <span>{currentQuestion.sectionTitle}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Keep the rest of your render method exactly the same... */}
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
      
      {/* Input Area - keep exactly the same as before */}
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
                  {currentQuestion && currentQuestion.expectedOptions && (
                    `Expected: ${currentQuestion.expectedOptions.slice(0, 3).join(', ')}${currentQuestion.expectedOptions.length > 3 ? '...' : ''} • Say 'go back' to change previous answers`
                  )}
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