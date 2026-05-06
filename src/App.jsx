import './css/global.css'
import Login from './pages/login'
import Udashboard from './pages/lgu/dashboard-u';
import Uupload from './pages/lgu/upload-u';
import ProtectedRoute from './components/ProtectedRoute'
import Register from './pages/register'
import Uprofile from './pages/lgu/profile-u';
import Ulayout from './components/layout-u'
import Uemployee from './pages/lgu/employee-u';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import Uview from './pages/lgu/view-u'

function App() {
  return (
    <>
      <Router>
        <Routes>

          <Route path="/" element={<Login/>} />
          <Route path="/register" element={<Register/>} />
          
          <Route element={<Ulayout/>}>
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

            <Route path="/view-u" element={
              <ProtectedRoute requiredRole="u">
                <Uview/>
              </ProtectedRoute> 
            } />

            <Route path="/profile-u" element={
              <ProtectedRoute requiredRole="u">
                <Uprofile/>
              </ProtectedRoute> 
            } />

            <Route path="/employee-u" element={
              <ProtectedRoute requiredRole="u">
                <Uemployee/>
              </ProtectedRoute> 
            } />
          </Route>
        </Routes>
      </Router>
    </>
  )
}

export default App
