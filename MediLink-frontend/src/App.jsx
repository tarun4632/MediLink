import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import MedicalKiosk from './components/MedicalKiosk'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import Login from './pages/Login'
import Form from './pages/Form'
import Result from './pages/Result'

function App() {
  const [count, setCount] = useState(0)

  return (
   <>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/form" element={<Form />} />
        <Route path="/result" element={<Result />} />
      </Routes>
    </BrowserRouter>
   </>
  )
}

export default App
