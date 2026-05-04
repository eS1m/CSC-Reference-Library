import './App.css'
import Login from './pages/login'
import Udashboard from './pages/lgu/dashboard-u';
import Uupload from './pages/lgu/upload-u';
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
          
          <Route path="/dashboard-u" element={
            <ProtectedRoute requiredRole="u">
              <Udashboard/>
            </ProtectedRoute> 
          } />

          <Route path="/upload-u" element={
            <ProtectedRoute requiredRole="u">
              <Uupload/>
            </ProtectedRoute> 
          } />
          
        </Routes>
      </Router>
    </>
  )
}

export default App
