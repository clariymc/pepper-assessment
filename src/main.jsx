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
  
  const messagesEndRef = React.useRef(null)
  
  // ... (keep the existing useEffect hooks for loading questionnaire and voice support)
  
  const addMessage = (text, isUser) => {
    setMessages(prev => [...prev, { text, isUser }])
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
      addMessage(`I can see you mentioned ${conditions.join(' and ')}. Let me ask a few more questions about this.`, false)
      setTimeout(() => {
        addMessage(personalizedQuestions[0], false)
      }, 1000)
    }, 1000)
  }
  
  const handleFollowUpComplete = () => {
    setInFollowUp(false)
    setFollowUpQuestions([])
    setCurrentFollowUpIndex(0)
    setDetectedConditions([])
    
    addMessage("Thank you for those details. Let's continue with the next question.", false)
    
    // Move to next main question
    setTimeout(() => {
      moveToNextMainQuestion()
    }, 1000)
  }
  
  const moveToNextMainQuestion = () => {
    if (currentQuestionIndex < allQuestions.length - 1) {
      const nextIndex = currentQuestionIndex + 1
      setCurrentQuestionIndex(nextIndex)
      
      const currentSection = allQuestions[currentQuestionIndex].sectionTitle
      const nextSection = allQuestions[nextIndex].sectionTitle
      
      setTimeout(() => {
        if (currentSection !== nextSection) {
          addMessage(`Now let's move on to questions about: ${nextSection}`, false)
          setTimeout(() => {
            addMessage(allQuestions[nextIndex].text, false)
          }, 1500)
        } else {
          addMessage(allQuestions[nextIndex].text, false)
        }
      }, 500)
    } else {
      // Assessment complete
      setTimeout(() => {
        addMessage("That completes our comprehensive assessment! In the full version, I'll now generate a summary for you to review and confirm.", false)
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
      addMessage(`Thank you! I heard: "${userAnswer}". Let's move on.`, false)
      moveToNextMainQuestion()
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
    
    addMessage(`Thank you for that information.`, false)
    
    // Check if there are more follow-up questions
    if (currentFollowUpIndex < followUpQuestions.length - 1) {
      setCurrentFollowUpIndex(prev => prev + 1)
      setTimeout(() => {
        addMessage(followUpQuestions[currentFollowUpIndex + 1], false)
      }, 1000)
    } else {
      // Ask if they want to add more information
      setTimeout(() => {
        addMessage("Have you finished describing your condition, or is there anything else you'd like to tell me about it?", false)
      }, 1000)
      setCurrentFollowUpIndex(-1) // Flag for "anything else" question
    }
  }
  
  // ... (keep existing voice recognition functions)
  
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
      addMessage("I understand. Let's move on to the next question.", false)
      
      if (inFollowUp) {
        handleFollowUpComplete()
      } else {
        moveToNextQuestion(userInput)
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
          addMessage("Thank you for that additional information.", false)
          setTimeout(() => {
            handleFollowUpComplete()
          }, 1000)
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
          addMessage(currentQuestion.clarification, false)
        }, 1000)
        setAttemptCount(1)
      } else if (attemptCount === 1) {
        // Second attempt failed - accept any text as fallback
        addMessage("Thank you for that information.", false)
        moveToNextQuestion(userInput)
        setAttemptCount(0)
      }
    } else {
      // Answer is valid - move on
      moveToNextQuestion(userInput)
      setAttemptCount(0)
    }
    
    setInputValue('')
  }
  
  // ... (keep the rest of the component the same, including the render method)
}