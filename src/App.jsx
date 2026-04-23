import './App.css'
import Login from './pages/login'
import Dashboard from './pages/dashboard'
import XUDashboard from './pages/dashboard-xu'
import ProtectedRoute from './components/ProtectedRoute'
import Register from './pages/register'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <>
      <Router>
        <Routes>

          <Route path="/" element={<Login/>} />

          <Route path="/register" element={<Register/>} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute requiredRole="u">
              <Dashboard/>
            </ProtectedRoute> 
          } />
          
          <Route path="/xu-dash" element={
            <ProtectedRoute requiredRole="admin">
              <XUDashboard/>
            </ProtectedRoute>
          } />  
        </Routes>
      </Router>
    </>
  )
}

export default App
