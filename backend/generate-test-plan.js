const xlsx = require('xlsx');

// Data structures
const requirements = [
  ['ID', 'Requirement Specifications'],
  ['RS001', 'User can register with email/password and select a role (Agency / CSC RO X / Admin)'],
  ['RS002', 'User can log in with email and password'],
  ['RS003', 'User can log in using Google Sign-In'],
  ['RS004', 'Newly registered accounts default to pending approval status and cannot access the system until approved'],
  ['RS005', 'Only authenticated users with a valid assigned role can access protected routes; unauthorized access is redirected'],
  ['RS006', 'Agency users can complete and save their agency profile (agency details, head details, HRM officers)'],
  ['RS007', 'Agency users can enter and save employee data (employment status table, HRM summary, personnel complement)'],
  ['RS008', 'Agency users can upload Self-Assessment Excel files to Google Drive through the portal'],
  ['RS009', 'Agency users can view their submitted files and current submission status'],
  ['RS010', 'The system blocks file upload access until both agency profile and employee data are fully completed'],
  ['RS011', 'CSC RO X users can view a dashboard showing total agencies, completed profiles, approved/rejected counts'],
  ['RS012', 'CSC RO X users can browse the Google Drive folder tree read-only (view and download, no delete)'],
  ['RS013', 'Administrators can approve or reject pending user registrations'],
  ['RS014', 'Administrators can view a real-time, chronological activity log of all user actions'],
  ['RS015', 'Administrators can browse Google Drive folders/files and delete items with confirmation'],
  ['RS016', 'The system records all major actions (uploads, approvals, logins, profile updates) to an audit log']
];

const testCases = [
  {
    id: 'TC001',
    desc: 'Verify that an approved user can log in using valid email and password credentials',
    req: 'RS002',
    createdBy: '[Your Name]',
    version: '1.0.0',
    log: 'Positive path testing for email/password authentication',
    tester: '[Tester Name]',
    date: '[Date]',
    status: '[To be filled]',
    prereqs: ['Access to Chrome/Firefox/Edge browser', 'Valid approved user account exists in Firebase Auth', 'User document exists in Firestore users collection with approvalStatus: approved'],
    testData: ['Email = agency1@cscro10.gov.ph', 'Password = TestPass123!'],
    scenario: 'Check that an approved user can successfully authenticate via email/password',
    environment: 'Operating System: Windows 10/11\nBrowser: Google Chrome Version 120+ (or equivalent)\nURL: https://[your-domain]/',
    steps: [
      ['1', 'Navigate to the login page', 'Login page loads with email, password fields, and Google sign-in button', '', ''],
      ['2', 'Enter valid email address', 'Email field accepts input', '', ''],
      ['3', 'Enter valid password', 'Password field masks input', '', ''],
      ['4', 'Click the Login button', 'System authenticates via Firebase Auth; user is redirected to role-appropriate dashboard', '', ''],
      ['5', 'Verify dashboard loads', 'Dashboard displays user-specific content without errors', '', '']
    ]
  },
  {
    id: 'TC002',
    desc: 'Verify that login fails gracefully when an incorrect password is provided',
    req: 'RS002',
    createdBy: '[Your Name]',
    version: '1.0.0',
    log: 'Negative path testing for email/password authentication',
    tester: '[Tester Name]',
    date: '[Date]',
    status: '[To be filled]',
    prereqs: ['Access to browser', 'Valid approved user account exists'],
    testData: ['Email = agency1@cscro10.gov.ph', 'Password = WrongPassword123!'],
    scenario: 'Check that the system rejects invalid credentials and displays an appropriate error',
    environment: 'Operating System: Windows 10/11\nBrowser: Google Chrome Version 120+',
    steps: [
      ['1', 'Navigate to the login page', 'Login page loads', '', ''],
      ['2', 'Enter valid email', 'Email field accepts input', '', ''],
      ['3', 'Enter invalid password', 'Password field masks input', '', ''],
      ['4', 'Click the Login button', 'Authentication fails; error message is displayed; user remains on login page', '', ''],
      ['5', 'Verify no dashboard access', 'Attempting to visit /dashboard-u redirects back to login', '', '']
    ]
  },
  {
    id: 'TC003',
    desc: 'Verify that an existing approved user can log in via Google Sign-In and access the system',
    req: 'RS003',
    createdBy: '[Your Name]',
    version: '1.0.0',
    log: 'Third-party OAuth authentication flow test',
    tester: '[Tester Name]',
    date: '[Date]',
    status: '[To be filled]',
    prereqs: ['Browser with pop-ups allowed', 'Google account already registered and approved in the system', 'Firebase Auth domain whitelisted for the deployment URL'],
    testData: ['Google Account = csc.reviewer@gmail.com'],
    scenario: 'Check that Google OAuth sign-in redirects correctly and grants access to approved users',
    environment: 'Operating System: Windows 10/11\nBrowser: Google Chrome Version 120+',
    steps: [
      ['1', 'Navigate to the login page', 'Login page loads', '', ''],
      ['2', 'Click Sign in with Google button', 'Google account picker popup appears', '', ''],
      ['3', 'Select an existing approved Google account', 'Popup closes; Firebase Auth processes the OAuth token', '', ''],
      ['4', 'Verify redirect', 'User is redirected to their role-appropriate dashboard', '', ''],
      ['5', 'Verify no approval modal', 'Account Under Review modal does NOT appear', '', '']
    ]
  },
  {
    id: 'TC004',
    desc: 'Verify that users with approvalStatus pending or rejected are blocked and shown an approval modal',
    req: 'RS004',
    createdBy: '[Your Name]',
    version: '1.0.0',
    log: 'Account approval workflow negative test',
    tester: '[Tester Name]',
    date: '[Date]',
    status: '[To be filled]',
    prereqs: ['A newly registered account exists with approvalStatus: pending in Firestore'],
    testData: ['Email = newagency@test.gov.ph', 'Password = TempPass123!'],
    scenario: 'Check that unapproved accounts cannot access the system and receive appropriate feedback',
    environment: 'Operating System: Windows 10/11\nBrowser: Google Chrome Version 120+',
    steps: [
      ['1', 'Navigate to login page', 'Login page loads', '', ''],
      ['2', 'Enter credentials for pending account', 'Credentials accepted by Firebase Auth', '', ''],
      ['3', 'Click Login', 'Account Under Review modal appears with message about pending approval', '', ''],
      ['4', 'Verify automatic sign-out', 'User is signed out and remains on login page', '', ''],
      ['5', 'Attempt direct URL access to /dashboard-u', 'Redirected back to login page', '', '']
    ]
  },
  {
    id: 'TC005',
    desc: 'Verify that a new user can register with email/password, select a role, and is created with pending status',
    req: 'RS001',
    createdBy: '[Your Name]',
    version: '1.0.0',
    log: 'End-to-end registration flow test',
    tester: '[Tester Name]',
    date: '[Date]',
    status: '[To be filled]',
    prereqs: ['Access to browser', 'Email address not already registered in Firebase Auth'],
    testData: ['Email = test.lgu.new@example.gov.ph', 'Password = SecurePass123!', 'Role = Agency User'],
    scenario: 'Check that the registration flow creates a pending account and displays the success modal',
    environment: 'Operating System: Windows 10/11\nBrowser: Google Chrome Version 120+',
    steps: [
      ['1', 'Navigate to /register', 'Registration page loads with role selector cards', '', ''],
      ['2', 'Enter email and password', 'Fields accept valid input', '', ''],
      ['3', 'Select Agency User role card', 'Agency role is selected/highlighted', '', ''],
      ['4', 'Click Register', 'Account created in Firebase Auth; users doc created with approvalStatus: pending', '', ''],
      ['5', 'Verify success modal', 'Modal appears: Account created successfully. Please wait for admin approval.', '', ''],
      ['6', 'Verify automatic sign-out', 'User is signed out; login button is available', '', '']
    ]
  },
  {
    id: 'TC006',
    desc: 'Verify that all three role options (Agency, CSC RO X, Admin) are selectable and persisted correctly',
    req: 'RS001',
    createdBy: '[Your Name]',
    version: '1.0.0',
    log: 'Role selector UI and data persistence test',
    tester: '[Tester Name]',
    date: '[Date]',
    status: '[To be filled]',
    prereqs: ['Three unique email addresses not already registered'],
    testData: ['Email A = role.u@test.gov.ph, Role = Agency User', 'Email B = role.p@test.gov.ph, Role = CSC RO X', 'Email C = role.admin@test.gov.ph, Role = Admin'],
    scenario: 'Check that each role selection is correctly saved to Firestore',
    environment: 'Operating System: Windows 10/11\nBrowser: Google Chrome Version 120+',
    steps: [
      ['1', 'Register with Agency User role', 'Firestore users doc has role: u', '', ''],
      ['2', 'Register with CSC RO X role', 'Firestore users doc has role: p', '', ''],
      ['3', 'Register with Admin role', 'Firestore users doc has role: admin', '', ''],
      ['4', 'Admin approves all three', 'All accounts show approvalStatus: approved in dashboard', '', ''],
      ['5', 'Log in with each account', 'Each user is redirected to the correct role dashboard', '', '']
    ]
  },
  {
    id: 'TC007',
    desc: 'Verify that the agency dashboard displays the correct workflow step and status indicators',
    req: 'RS006, RS007, RS010',
    createdBy: '[Your Name]',
    version: '1.0.0',
    log: 'Dashboard UI and workflow state verification',
    tester: '[Tester Name]',
    date: '[Date]',
    status: '[To be filled]',
    prereqs: ['Approved agency user account', 'Agency profile is incomplete'],
    testData: ['Email = agency.dashboard@test.gov.ph'],
    scenario: 'Check that the dashboard reflects the current workflow step accurately',
    environment: 'Operating System: Windows 10/11\nBrowser: Google Chrome Version 120+',
    steps: [
      ['1', 'Log in as agency user', 'Dashboard loads; step indicator shows Step 1 (Profile Incomplete)', '', ''],
      ['2', 'Complete and save agency profile', 'Dashboard updates to Step 2 (Employee Data Incomplete)', '', ''],
      ['3', 'Complete and save employee data', 'Dashboard updates to Step 3 (Ready to Upload)', '', ''],
      ['4', 'Upload a Self-Assessment file', 'Dashboard updates to Step 4 (Pending Review)', '', ''],
      ['5', 'Admin approves the file', 'Dashboard updates to Step 5 (Ready for Assist-Plan)', '', '']
    ]
  },
  {
    id: 'TC008',
    desc: 'Verify that the agency profile form validates all required fields and saves to Firestore',
    req: 'RS006',
    createdBy: '[Your Name]',
    version: '1.0.0',
    log: 'Form validation and Firestore persistence test',
    tester: '[Tester Name]',
    date: '[Date]',
    status: '[To be filled]',
    prereqs: ['Approved agency user account', 'No existing agencyProfiles document for this user'],
    testData: ['Agency Name = City Government of Cagayan de Oro', 'Region = Region X', 'Sector = LGU', 'Status = Active', 'Resolution Status = Adopted', 'Head Name = John Doe', 'Head Designation = City Mayor', 'HRM Officer 1 = Jane Smith, 09171234567, jane@example.gov.ph, HRMO, Active'],
    scenario: 'Check that all 8 validation fields are enforced and data persists correctly',
    environment: 'Operating System: Windows 10/11\nBrowser: Google Chrome Version 120+',
    steps: [
      ['1', 'Navigate to /profile-u', 'Profile form loads with editable fields', '', ''],
      ['2', 'Leave fields empty and click Save', 'Validation error appears; save is blocked', '', ''],
      ['3', 'Fill all agency details, head details, and at least one HRM officer with all 5 fields', 'Save button processes successfully', '', ''],
      ['4', 'Refresh the page', 'All saved data reloads correctly from Firestore', '', ''],
      ['5', 'Verify agencyProfiles document in Firestore', 'Document exists with UID and all entered fields', '', '']
    ]
  },
  {
    id: 'TC009',
    desc: 'Verify that the employee data table accepts numeric inputs, prevents negatives, and saves all required summary fields',
    req: 'RS007',
    createdBy: '[Your Name]',
    version: '1.0.0',
    log: 'Employee table input validation and persistence test',
    tester: '[Tester Name]',
    date: '[Date]',
    status: '[To be filled]',
    prereqs: ['Approved agency user account', 'Agency profile is complete'],
    testData: ['Data As Of = 2024-12-01', 'Table inputs = various positive integers across the 56 cells', 'HRM Summary = permanent: 10, tempContractCasual: 5, coterminusOthers: 2', 'Personnel Complement = firstLevel: 8, secondLevelPT: 4, secondLevelEM: 3, thirdLevelPA: 2'],
    scenario: 'Check that employee data is validated and persisted correctly',
    environment: 'Operating System: Windows 10/11\nBrowser: Google Chrome Version 120+',
    steps: [
      ['1', 'Navigate to /employee-u', 'Employee table and summary forms load', '', ''],
      ['2', 'Enter negative number in a table cell', 'Input is clamped to 0', '', ''],
      ['3', 'Leave Data As Of blank and click Save', 'Validation blocks save with Data As Of is required', '', ''],
      ['4', 'Fill all 56 table cells, HRM Summary (3 fields), Personnel Complement (4 fields), and Data As Of', 'Save succeeds; success message appears', '', ''],
      ['5', 'Refresh and verify', 'All values reload correctly from Firestore agencyEmployees document', '', ''],
      ['6', 'Verify 0 displays correctly', 'Cells with value 0 show 0 instead of blank', '', '']
    ]
  },
  {
    id: 'TC010',
    desc: 'Verify that an agency with complete profile and employee data can upload a Self-Assessment Excel file',
    req: 'RS008, RS010',
    createdBy: '[Your Name]',
    version: '1.0.0',
    log: 'End-to-end upload flow with valid prerequisites',
    tester: '[Tester Name]',
    date: '[Date]',
    status: '[To be filled]',
    prereqs: ['Approved agency user account', 'Complete agency profile (agencyProfiles doc exists and passes validation)', 'Complete employee data (agencyEmployees doc exists and passes validation)', 'A valid .xlsx file available for upload'],
    testData: ['File = PRIME-HRM Assessment-(City Government of CDO).xlsx', 'File Type = Self-Assessment'],
    scenario: 'Check that the upload flow succeeds when prerequisites are met',
    environment: 'Operating System: Windows 10/11\nBrowser: Google Chrome Version 120+',
    steps: [
      ['1', 'Navigate to /upload-u', 'Upload page loads; drag-and-drop zone is active (no lock modal)', '', ''],
      ['2', 'Drag and drop a valid .xlsx file', 'File name appears in the upload area', '', ''],
      ['3', 'Click Upload', 'Spinner appears; backend returns 200 OK with fileId and webViewLink', '', ''],
      ['4', 'Verify Firestore record', 'agencySubmissions document created with fileType: Self-Assessment, status: Pending', '', ''],
      ['5', 'Verify Google Drive', 'File exists in Root > Agency Name > 2024 folder with correct name', '', ''],
      ['6', 'Verify activity log', 'UPLOAD_FILE entry appears in admin Activity Logs', '', '']
    ]
  },
  {
    id: 'TC011',
    desc: 'Verify that the upload page is locked and shows a LockModal when profile or employee data is incomplete',
    req: 'RS010',
    createdBy: '[Your Name]',
    version: '1.0.0',
    log: 'ProfileGuard negative path test',
    tester: '[Tester Name]',
    date: '[Date]',
    status: '[To be filled]',
    prereqs: ['Approved agency user account', 'Incomplete agency profile (e.g., missing head designation)'],
    testData: ['N/A'],
    scenario: 'Check that upload access is gated until prerequisites are complete',
    environment: 'Operating System: Windows 10/11\nBrowser: Google Chrome Version 120+',
    steps: [
      ['1', 'Log in as agency with incomplete profile', 'Dashboard shows Step 1 or 2', '', ''],
      ['2', 'Navigate to /upload-u', 'Page loads but is overlaid with LockModal', '', ''],
      ['3', 'Verify LockModal content', 'Modal displays which steps are incomplete (Profile and/or Employee)', '', ''],
      ['4', 'Click Go to Profile or Go to Employees', 'User is redirected to the corresponding page', '', ''],
      ['5', 'Complete missing data and return to /upload-u', 'LockModal is dismissed; upload zone is accessible', '', '']
    ]
  },
  {
    id: 'TC012',
    desc: 'Verify that the agency can view their own submission history with correct status badges',
    req: 'RS009',
    createdBy: '[Your Name]',
    version: '1.0.0',
    log: 'Submission grid and status display test',
    tester: '[Tester Name]',
    date: '[Date]',
    status: '[To be filled]',
    prereqs: ['Approved agency user account', 'At least one submission exists in agencySubmissions'],
    testData: ['N/A (uses existing data)'],
    scenario: 'Check that the view page displays submissions accurately',
    environment: 'Operating System: Windows 10/11\nBrowser: Google Chrome Version 120+',
    steps: [
      ['1', 'Navigate to /view-u', 'File grid loads showing all submissions for the current user', '', ''],
      ['2', 'Verify file card content', 'Each card shows: file name, file type badge, status badge, upload date', '', ''],
      ['3', 'Verify status badges', 'Approved = green, Rejected = red, Pending = yellow/amber', '', ''],
      ['4', 'Click Open in Drive', 'File opens in a new tab via webViewLink', '', ''],
      ['5', 'Verify only own files', 'Submissions from other agencies are not visible', '', '']
    ]
  },
  {
    id: 'TC013',
    desc: 'Verify that the CSC RO X dashboard displays accurate counts for agencies, profiles, and submissions',
    req: 'RS011',
    createdBy: '[Your Name]',
    version: '1.0.0',
    log: 'Dashboard statistics accuracy verification',
    tester: '[Tester Name]',
    date: '[Date]',
    status: '[To be filled]',
    prereqs: ['Approved CSC RO X user account (role: p)', 'Multiple agency profiles and submissions exist in Firestore'],
    testData: ['N/A (reads live data)'],
    scenario: 'Check that stat cards and recent uploads table reflect real Firestore data',
    environment: 'Operating System: Windows 10/11\nBrowser: Google Chrome Version 120+',
    steps: [
      ['1', 'Log in as CSC RO X user', 'Dashboard loads with stat cards at top', '', ''],
      ['2', 'Verify Total Registered Agencies count', 'Count matches number of users docs with role: u and approvalStatus: approved', '', ''],
      ['3', 'Verify Completed Profiles count', 'Count matches number of agencyProfiles docs that pass validateAgency() (all 8 fields)', '', ''],
      ['4', 'Verify Approved Count and Rejected Count', 'Match counts of agencySubmissions with corresponding statuses', '', ''],
      ['5', 'Scroll to Recent Uploads table', 'Table shows most recent uploads with agency name, file name, date', '', '']
    ]
  },
  {
    id: 'TC014',
    desc: 'Verify that CSC RO X users can browse Drive folders and files but cannot delete',
    req: 'RS012',
    createdBy: '[Your Name]',
    version: '1.0.0',
    log: 'Read-only Drive browser permission test',
    tester: '[Tester Name]',
    date: '[Date]',
    status: '[To be filled]',
    prereqs: ['Approved CSC RO X user account', 'Files exist in Google Drive'],
    testData: ['N/A'],
    scenario: 'Check that CSC RO X browser allows view/download but not delete',
    environment: 'Operating System: Windows 10/11\nBrowser: Google Chrome Version 120+',
    steps: [
      ['1', 'Navigate to /drive-browser-csc', 'Drive browser loads with breadcrumb Root', '', ''],
      ['2', 'Click an agency folder', 'Folder contents load (subfolders or files)', '', ''],
      ['3', 'Verify folder cards', 'Each folder shows a folder icon and name; no Delete button is visible', '', ''],
      ['4', 'Verify file table', 'Files show View and Download action buttons', '', ''],
      ['5', 'Click View on a file', 'File opens in new Google Drive viewer tab', '', ''],
      ['6', 'Click Download on a file', 'Direct download starts via webContentLink', '', ''],
      ['7', 'Confirm no delete UI', 'Delete button/modal trigger is absent from both folders and files', '', '']
    ]
  },
  {
    id: 'TC015',
    desc: 'Verify that administrators can view pending accounts and approve/reject them',
    req: 'RS013',
    createdBy: '[Your Name]',
    version: '1.0.0',
    log: 'User approval workflow admin-side test',
    tester: '[Tester Name]',
    date: '[Date]',
    status: '[To be filled]',
    prereqs: ['Approved admin user account (role: admin)', 'At least one pending user exists in users collection'],
    testData: ['Pending user email = pending.user@test.gov.ph'],
    scenario: 'Check that admin can approve a pending account and the user gains access',
    environment: 'Operating System: Windows 10/11\nBrowser: Google Chrome Version 120+',
    steps: [
      ['1', 'Log in as admin', 'Admin dashboard loads', '', ''],
      ['2', 'Scroll to Pending Account Approvals table', 'Table lists users with approvalStatus: pending', '', ''],
      ['3', 'Click Approve on a pending user', 'Users approvalStatus updates to approved in Firestore', '', ''],
      ['4', 'Verify activity log', 'APPROVE_USER entry appears in Activity Logs with target user ID', '', ''],
      ['5', 'Log in as the newly approved user', 'User successfully accesses their role dashboard without the Account Under Review modal', '', ''],
      ['6', 'Click Reject on another pending user', 'Users approvalStatus updates to rejected; user sees rejection message on next login', '', '']
    ]
  },
  {
    id: 'TC016',
    desc: 'Verify that the Activity Logs page displays chronological audit records with correct action badges',
    req: 'RS014, RS016',
    createdBy: '[Your Name]',
    version: '1.0.0',
    log: 'Audit trail completeness and accuracy test',
    tester: '[Tester Name]',
    date: '[Date]',
    status: '[To be filled]',
    prereqs: ['Approved admin user account', 'Various actions have been performed (logins, uploads, approvals, profile updates)'],
    testData: ['N/A (uses existing activity log data)'],
    scenario: 'Check that all logged actions appear correctly in the full-page activity log',
    environment: 'Operating System: Windows 10/11\nBrowser: Google Chrome Version 120+',
    steps: [
      ['1', 'Navigate to /dashboard-a', 'Dashboard shows recent activity log entries inline', '', ''],
      ['2', 'Click View All Activity Logs or navigate to /activity-logs-a', 'Full-page activity logs table loads', '', ''],
      ['3', 'Verify columns', 'Each row shows: timestamp, user email, user role, action badge, details', '', ''],
      ['4', 'Verify action badges', 'Colors match: UPLOAD_FILE=blue, APPROVE_FILE/REJECT_FILE=green/red, LOGIN=gray, etc.', '', ''],
      ['5', 'Verify chronological order', 'Most recent entries appear first (descending by timestamp)', '', ''],
      ['6', 'Verify Firestore source', 'activityLogs collection contains matching documents with server timestamps', '', '']
    ]
  },
  {
    id: 'TC017',
    desc: 'Verify that administrators can delete files from Google Drive and the matching Firestore submission record is removed',
    req: 'RS015',
    createdBy: '[Your Name]',
    version: '1.0.0',
    log: 'Admin delete flow with Firestore cleanup test',
    tester: '[Tester Name]',
    date: '[Date]',
    status: '[To be filled]',
    prereqs: ['Approved admin user account', 'A file exists in Google Drive that was uploaded via the system (so it has a matching agencySubmissions record)'],
    testData: ['File to delete = a recently uploaded test file'],
    scenario: 'Check that admin delete removes the item from Drive and cleans up Firestore metadata',
    environment: 'Operating System: Windows 10/11\nBrowser: Google Chrome Version 120+',
    steps: [
      ['1', 'Navigate to /drive-browser-a', 'Admin Drive browser loads', '', ''],
      ['2', 'Locate a file in the file table', 'File row shows View, Download, and Delete actions', '', ''],
      ['3', 'Click Delete on the file', 'Confirmation modal appears with file name', '', ''],
      ['4', 'Confirm deletion', 'Backend returns 200 OK; file is moved to trash in Google Drive', '', ''],
      ['5', 'Verify Firestore cleanup', 'Matching agencySubmissions doc with that fileId is deleted', '', ''],
      ['6', 'Verify page refresh', 'Deleted file no longer appears in the file table', '', '']
    ]
  },
  {
    id: 'TC018',
    desc: 'Verify that the system handles 403 permission errors gracefully when deleting files owned by another Google account',
    req: 'RS015',
    createdBy: '[Your Name]',
    version: '1.0.0',
    log: 'Negative path: delete permission denial handling',
    tester: '[Tester Name]',
    date: '[Date]',
    status: '[To be filled]',
    prereqs: ['Approved admin user account', 'A file exists in Google Drive that is owned by a different Google account (not the backend OAuth account)'],
    testData: ['File to attempt deletion = pre-existing file owned by external account'],
    scenario: 'Check that the backend returns a structured 403 error and the frontend displays a clear message',
    environment: 'Operating System: Windows 10/11\nBrowser: Google Chrome Version 120+',
    steps: [
      ['1', 'Navigate to /drive-browser-a', 'Admin Drive browser loads', '', ''],
      ['2', 'Locate an externally owned file', 'File is listed in the browser', '', ''],
      ['3', 'Click Delete and confirm', 'Backend returns 403 with code: NOT_OWNER', '', ''],
      ['4', 'Verify frontend error display', 'Red error text appears in modal: Cannot delete this item because it is owned by a different Google account...', '', ''],
      ['5', 'Verify modal remains open', 'User can click Cancel to dismiss without page crash', '', ''],
      ['6', 'Verify file remains', 'File is still present in Drive and Firestore', '', '']
    ]
  },
  {
    id: 'TC019',
    desc: 'Verify that users cannot access routes belonging to other roles and are redirected appropriately',
    req: 'RS005',
    createdBy: '[Your Name]',
    version: '1.0.0',
    log: 'Cross-role access control and redirection test',
    tester: '[Tester Name]',
    date: '[Date]',
    status: '[To be filled]',
    prereqs: ['One approved account for each role: Agency (u), CSC RO X (p), Admin (admin)'],
    testData: ['Agency user, CSC RO X user, Admin user credentials'],
    scenario: 'Check that each role is confined to its own routes',
    environment: 'Operating System: Windows 10/11\nBrowser: Google Chrome Version 120+',
    steps: [
      ['1', 'Log in as Agency user and navigate to /dashboard-a', 'Redirected to /dashboard-u', '', ''],
      ['2', 'Log in as Agency user and navigate to /dashboard-p', 'Redirected to /dashboard-u', '', ''],
      ['3', 'Log in as CSC RO X user and navigate to /dashboard-u', 'Redirected to /dashboard-p', '', ''],
      ['4', 'Log in as CSC RO X user and navigate to /dashboard-a', 'Redirected to /dashboard-p', '', ''],
      ['5', 'Log in as Admin and navigate to /dashboard-u', 'Redirected to /dashboard-a', '', ''],
      ['6', 'Log in as Admin and navigate to /dashboard-p', 'Redirected to /dashboard-a', '', ''],
      ['7', 'Without logging in, visit /dashboard-u', 'Redirected to / (login page)', '', '']
    ]
  },
  {
    id: 'TC020',
    desc: 'Verify that the 6-step workflow gate correctly blocks and allows upload access based on profile and employee completion',
    req: 'RS010',
    createdBy: '[Your Name]',
    version: '1.0.0',
    log: 'Upload gating logic across all workflow states',
    tester: '[Tester Name]',
    date: '[Date]',
    status: '[To be filled]',
    prereqs: ['Approved agency user account', 'Ability to manipulate profile/employee completion state'],
    testData: ['N/A'],
    scenario: 'Check that upload access is gated at Step 3 and Step 5 only',
    environment: 'Operating System: Windows 10/11\nBrowser: Google Chrome Version 120+',
    steps: [
      ['1', 'Clear profile and employee data', 'Dashboard shows Step 1; /upload-u shows LockModal', '', ''],
      ['2', 'Complete profile only', 'Dashboard shows Step 2; /upload-u still shows LockModal', '', ''],
      ['3', 'Complete employee data', 'Dashboard shows Step 3; /upload-u upload zone is accessible', '', ''],
      ['4', 'Upload Self-Assessment', 'Dashboard shows Step 4 (Pending); /upload-u shows LockModal', '', ''],
      ['5', 'Admin approves Self-Assessment', 'Dashboard shows Step 5; /upload-u upload zone is accessible again', '', ''],
      ['6', 'Upload Assist-Plan', 'Dashboard shows Step 6 (Pending Review)', '', '']
    ]
  }
];

// Create workbook
const wb = xlsx.utils.book_new();

// Add Requirements sheet
const reqWs = xlsx.utils.aoa_to_sheet(requirements);
reqWs['!cols'] = [{wch: 12}, {wch: 100}];
xlsx.utils.book_append_sheet(wb, reqWs, 'Requirements');

// Helper to create a test case sheet
testCases.forEach((tc, idx) => {
  const rows = [];
  
  // Row 1: ID and Description
  rows.push(['Test Case ID', '', tc.id, '', '', 'Test Case Description', '', tc.desc]);
  
  // Row 2: Requirement, Created By, Version
  rows.push(['Related Requirement', '', tc.req, '', '', 'Created By', '', tc.createdBy, '', 'Version', '', tc.version]);
  
  // Row 3: empty
  rows.push([]);
  
  // Row 4: QA Tester Log
  rows.push(['QA Tester\'s Log', '', tc.log]);
  
  // Row 5: empty
  rows.push([]);
  
  // Row 6: Tester Name, Date, Status
  rows.push(['Tester\'s Name', '', tc.tester, '', '', 'Date Tested', '', tc.date, '', 'Test Case Status', '', tc.status]);
  
  // Row 7: empty
  rows.push([]);
  
  // Row 8: Prerequisites / Test Data headers
  rows.push(['#', 'Prerequisites', '', '', '', '#', 'Test Data']);
  
  // Rows 9-12: prereqs and test data
  for (let i = 0; i < 4; i++) {
    const prereq = tc.prereqs[i] || '';
    const tdata = tc.testData[i] || '';
    rows.push([(i+1).toString(), prereq, '', '', '', (i+1).toString(), tdata]);
  }
  
  // Row 13: empty
  rows.push([]);
  
  // Row 14: Scenario and Environment
  rows.push(['Test Scenario:', '', tc.scenario, '', '', 'Test Environment:', '', tc.environment]);
  
  // Row 15: empty
  rows.push([]);
  
  // Row 16: Step headers
  rows.push(['Step #', 'Step Details', '', '', 'Expected Results', '', '', 'Actual Results', '', '', 'Pass / Fail / Not Executed / Suspended']);
  
  // Rows 17+: steps
  tc.steps.forEach(step => {
    rows.push([step[0], step[1], '', '', step[2], '', '', step[3], '', '', step[4]]);
  });
  
  const ws = xlsx.utils.aoa_to_sheet(rows);
  
  // Set column widths
  ws['!cols'] = [
    {wch: 10}, {wch: 35}, {wch: 8}, {wch: 8}, {wch: 8},
    {wch: 12}, {wch: 12}, {wch: 35}, {wch: 8}, {wch: 8}, {wch: 12}, {wch: 12}
  ];
  
  xlsx.utils.book_append_sheet(wb, ws, 'TestCase ' + (idx + 1));
});

// Write file
xlsx.writeFile(wb, '../PRIME-HRM_UAT_TestPlan.xlsx');
console.log('Excel file created: PRIME-HRM_UAT_TestPlan.xlsx');
console.log('Sheets: Requirements + ' + testCases.length + ' test cases');
