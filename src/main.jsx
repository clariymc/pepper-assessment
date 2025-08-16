import React from 'react'
import ReactDOM from 'react-dom/client'

function App() {
  return (
    <div style={{padding: '20px', fontFamily: 'Arial'}}>
      <h1>🏥 Pepper Pre-operative Assessment</h1>
      <p>App is loading successfully!</p>
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<App />)