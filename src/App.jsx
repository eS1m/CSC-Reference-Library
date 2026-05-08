import './css/global.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import Login from './pages/login'
import Register from './pages/register'

import Ulayout from './components/layout-u'
import Udashboard from './pages/lgu/dashboard-u';
import Uupload from './pages/lgu/upload-u';
import Uprofile from './pages/lgu/profile-u';
import Uemployee from './pages/lgu/employee-u';
import Uview from './pages/lgu/view-u'

import Playout from './components/layout-p'
import Pdashboard from './pages/prime/dashboard-p';
import Preview from './pages/prime/review-p';
// import Papproved from './pages/prime/approved-p';  // Future
// import Prejected from './pages/prime/rejected-p';  // Future
// import Pprofile from './pages/prime/profile-p';    // Future

import Alayout from './components/layout-a'
import Adashboard from './pages/admin/dashboard-a';
import Aprofile from './pages/admin/profile-a';

import ProtectedRoute from './components/ProtectedRoute'
import ProfileGuard from './components/ProfileGuard';

function App() {
  return (
    <>
      <Router>
        <Routes>

          <Route path="/" element={<Login/>} />
          <Route path="/register" element={<Register/>} />
          
          {/* U Routes - Strictly for LGU/Agency users */}
          <Route element={<Ulayout/>}>
            <Route path="/dashboard-u" element={
              <ProtectedRoute requiredRole="u">
                <Udashboard/>
              </ProtectedRoute> 
            } />
            <Route path="/upload-u" element={
              <ProtectedRoute requiredRole="u">
                <ProfileGuard>
                  <Uupload/>
                </ProfileGuard>
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

          {/* P Routes - Strictly for PRIME-HRM officers */}
          <Route element={<Playout/>}>
            <Route path="/dashboard-p" element={
              <ProtectedRoute requiredRole="p">
                <Pdashboard/>
              </ProtectedRoute> 
            } />
            {/* Future routes - create placeholder components or remove for now */}
            <Route path="/review-p" element={
              <ProtectedRoute requiredRole="p">
                <Preview/>
              </ProtectedRoute> 
            } />
            {/* <Route path="/approved-p" element={
              <ProtectedRoute requiredRole="p">
                <Papproved/>
              </ProtectedRoute> 
            } />
            <Route path="/rejected-p" element={
              <ProtectedRoute requiredRole="p">
                <Prejected/>
              </ProtectedRoute> 
            } />
            <Route path="/profile-p" element={
              <ProtectedRoute requiredRole="p">
                <Pprofile/>
              </ProtectedRoute> 
            } /> */}
          </Route>

          {/* A Routes - Strictly for System Administrators */}
          <Route element={<Alayout/>}>
            <Route path="/dashboard-a" element={
              <ProtectedRoute requiredRole="admin">
                <Adashboard/>
              </ProtectedRoute> 
            } />
          </Route>

        </Routes>
      </Router>
    </>
  )
}

export default App