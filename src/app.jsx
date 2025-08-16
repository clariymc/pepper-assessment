import { useState } from 'react'
import ConsentScreen from './components/ConsentScreen'
import ChatInterface from './components/ChatInterface'
import AdminConsole from './components/AdminConsole'

function App() {
  const [hasConsented, setHasConsented] = useState(
    localStorage.getItem('pepper-consent') === 'true'
  )
  
  const [currentPage, setCurrentPage] = useState('chat')
  
  // Check if we're on the admin page
  const isAdminPage = window.location.pathname === '/admin'
  
  if (!hasConsented && !isAdminPage) {
    return <ConsentScreen onConsent={() => {
      localStorage.setItem('pepper-consent', 'true')
      setHasConsented(true)
    }} />
  }
  
  if (isAdminPage) {
    return <AdminConsole />
  }
  
  return <ChatInterface />
}

export default App