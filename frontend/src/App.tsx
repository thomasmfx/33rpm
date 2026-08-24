import { Outlet } from 'react-router-dom'
import Header from './components/Header/Header'
import LojaProvider from './contexts/LojaProvider'

function App() {
  return (
    <LojaProvider>
      <Header />
      <Outlet />
    </LojaProvider>
  )
}

export default App
