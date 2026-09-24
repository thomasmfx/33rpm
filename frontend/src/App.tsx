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

  // a curadoria tem a própria barra lateral, com o caminho de volta para a loja
  const isCuradoria = pathname.startsWith('/curadoria')

  return (
    <LojaProvider>
      {!isCuradoria && <Header />}
      <Outlet />
      <ChatbotBolha />
    </LojaProvider>
  )
}

export default App
