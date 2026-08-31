import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './components/Header/Header'
import LojaProvider from './contexts/LojaProvider'
import ChatbotBolha from './components/Chatbot/ChatbotBolha'

function App() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <LojaProvider>
      <Header />
      <Outlet />
      <ChatbotBolha />
    </LojaProvider>
  )
}

export default App
