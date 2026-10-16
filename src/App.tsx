import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminShell } from './components/layout/AdminShell'
import { StudentShell } from './components/layout/StudentShell'
import { Spinner } from './components/ui/EmptyState'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ClassSessionProvider } from './context/ClassSessionContext'
import { ToastProvider } from './context/ToastContext'
import { supabaseConfigured } from './lib/env'
import { Landing } from './pages/Landing'
import { SetupNeeded } from './pages/SetupNeeded'
import { AdminLogin } from './pages/admin/Login'
import { ClassGate } from './pages/student/ClassGate'

const Dashboard = lazy(() => import('./pages/admin/Dashboard').then((mod) => ({ default: mod.Dashboard })))
const ClassList = lazy(() => import('./pages/admin/ClassList').then((mod) => ({ default: mod.ClassList })))
const ClassForm = lazy(() => import('./pages/admin/ClassForm').then((mod) => ({ default: mod.ClassForm })))
const ClassWorkspace = lazy(() => import('./pages/admin/ClassWorkspace').then((mod) => ({ default: mod.ClassWorkspace })))
const ContentManager = lazy(() => import('./pages/admin/ContentManager').then((mod) => ({ default: mod.ContentManager })))
const AdminSettings = lazy(() => import('./pages/admin/Settings').then((mod) => ({ default: mod.AdminSettings })))
const StudentOverview = lazy(() => import('./pages/student/Overview').then((mod) => ({ default: mod.StudentOverview })))
const StudentOutline = lazy(() => import('./pages/student/Outline').then((mod) => ({ default: mod.StudentOutline })))
const StudentResources = lazy(() => import('./pages/student/Resources').then((mod) => ({ default: mod.StudentResources })))
const StudentLabs = lazy(() => import('./pages/student/Labs').then((mod) => ({ default: mod.StudentLabs })))
const StudentLabDetail = lazy(() => import('./pages/student/LabDetail').then((mod) => ({ default: mod.StudentLabDetail })))
const LabPrint = lazy(() => import('./pages/student/LabPrint').then((mod) => ({ default: mod.LabPrint })))
const StudentTasks = lazy(() => import('./pages/student/Tasks').then((mod) => ({ default: mod.StudentTasks })))
const StudentAnnouncements = lazy(() => import('./pages/student/Announcements').then((mod) => ({ default: mod.StudentAnnouncements })))
const StudentGuidelines = lazy(() => import('./pages/student/Guidelines').then((mod) => ({ default: mod.StudentGuidelines })))
const StudentSettings = lazy(() => import('./pages/student/Settings').then((mod) => ({ default: mod.StudentSettings })))

function AdminGuard() {
  const { ready, profile } = useAuth()
  if (!ready) return <Spinner label="Checking admin access" />
  if (!profile) return <Navigate to="/admin/login" replace />
  return <AdminShell />
}

function AppRoutes() {
  if (!supabaseConfigured()) return <SetupNeeded />

  return (
    <Suspense fallback={<Spinner label="Loading" />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminGuard />}>
          <Route index element={<Dashboard />} />
          <Route path="classes" element={<ClassList />} />
          <Route path="classes/new" element={<ClassForm />} />
          <Route path="classes/:id" element={<ClassWorkspace />} />
          <Route path="content" element={<ContentManager />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route path="/c/:slug" element={<ClassGate />}>
          <Route path="labs/:labId/print" element={<LabPrint />} />
          <Route element={<StudentShell />}>
            <Route index element={<StudentOverview />} />
            <Route path="outline" element={<StudentOutline />} />
            <Route path="resources" element={<StudentResources />} />
            <Route path="labs" element={<StudentLabs />} />
            <Route path="labs/:labId" element={<StudentLabDetail />} />
            <Route path="tasks" element={<StudentTasks />} />
            <Route path="announcements" element={<StudentAnnouncements />} />
            <Route path="guidelines" element={<StudentGuidelines />} />
            <Route path="settings" element={<StudentSettings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ClassSessionProvider>
            <AppRoutes />
          </ClassSessionProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
