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
import ActionPlanU from './pages/lgu/action-plan-u';
// import TestPageU from './excel_test_data/test_pages/test-page-u';
// please work bro

import Playout from './components/layout-p'
import Pdashboard from './pages/prime/dashboard-p';
import DriveBrowserCSC from './pages/prime/drive-browser-csc';
import DeletionRequestsP from './pages/prime/deletion-requests-p';
import RecommendationsP from './pages/prime/recommendations-p';

import Alayout from './components/layout-a'
import Adashboard from './pages/admin/dashboard-a';

import ActivityLogsA from './pages/admin/activity-logs-a';
import DriveBrowserA from './pages/admin/drive-browser-a';
import DeletionRequestsA from './pages/admin/deletion-requests-a';
// import TestPageA from './excel_test_data/test_pages/test-page-a';

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
            <Route path="/action-plan-u" element={
              <ProtectedRoute requiredRole="u">
                <ProfileGuard>
                  <ActionPlanU/>
                </ProfileGuard>
              </ProtectedRoute> 
            } />
            {/* <Route path="/test-page-u" element={
              <ProtectedRoute requiredRole="u">
                <TestPageU/>
              </ProtectedRoute> 
            } /> */}
          </Route>

          {/* P Routes - Strictly for CSC RO X */}
          <Route element={<Playout/>}>
            <Route path="/dashboard-p" element={
              <ProtectedRoute requiredRole="p">
                <Pdashboard/>
              </ProtectedRoute> 
            } />
            <Route path="/drive-browser-csc" element={
              <ProtectedRoute requiredRole="p">
                <DriveBrowserCSC/>
              </ProtectedRoute> 
            } />
            <Route path="/deletion-requests-p" element={
              <ProtectedRoute requiredRole="p">
                <DeletionRequestsP/>
              </ProtectedRoute> 
            } />
            <Route path="/recommendations-p" element={
              <ProtectedRoute requiredRole="p">
                <RecommendationsP/>
              </ProtectedRoute> 
            } />
          </Route>

          {/* A Routes - Strictly for System Administrators */}
          <Route element={<Alayout/>}>
            <Route path="/dashboard-a" element={
              <ProtectedRoute requiredRole="admin">
                <Adashboard/>
              </ProtectedRoute> 
            } />
            <Route path="/activity-logs-a" element={
              <ProtectedRoute requiredRole="admin">
                <ActivityLogsA/>
              </ProtectedRoute> 
            } />
            <Route path="/drive-browser-a" element={
              <ProtectedRoute requiredRole="admin">
                <DriveBrowserA/>
              </ProtectedRoute> 
            } />
            <Route path="/deletion-requests-a" element={
              <ProtectedRoute requiredRole="admin">
                <DeletionRequestsA/>
              </ProtectedRoute> 
            } />
            {/* <Route path="/test-page-a" element={
              <ProtectedRoute requiredRole="admin">
                <TestPageA/>
              </ProtectedRoute> 
            } /> */}
          </Route>

        </Routes>
      </Router>
    </>
  )
}

export default App