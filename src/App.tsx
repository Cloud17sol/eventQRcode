import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { GuestRoute, ProtectedRoute } from '@/components/common/ProtectedRoute'
import { PwaRefresh } from '@/components/pwa/PwaRefresh'
import { EventLayout } from '@/layouts/EventLayout'
import { OrganizerLayout } from '@/layouts/OrganizerLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { CheckInsPage } from '@/pages/events/CheckInsPage'
import { CreateEventPage } from '@/pages/events/CreateEventPage'
import { EventListPage } from '@/pages/events/EventListPage'
import { EventOverviewPage } from '@/pages/events/EventOverviewPage'
import { EventSettingsPage } from '@/pages/events/EventSettingsPage'
import { GuestFormPage } from '@/pages/events/GuestFormPage'
import { GuestImportPage } from '@/pages/events/GuestImportPage'
import { GuestListPage } from '@/pages/events/GuestListPage'
import { GatesPage } from '@/pages/events/GatesPage'
import { InvitationsPage } from '@/pages/events/InvitationsPage'
import { StaffPage } from '@/pages/events/StaffPage'
import { InvitePage } from '@/pages/invite/InvitePage'
import { RegisterPage } from '@/pages/register/RegisterPage'

const ScannerPage = lazy(() =>
  import('@/pages/scanner/ScannerPage').then((module) => ({ default: module.ScannerPage })),
)

export default function App() {
  return (
    <>
      <PwaRefresh />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<OrganizerLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/events" element={<EventListPage />} />
            <Route path="/events/new" element={<CreateEventPage />} />
            <Route path="/events/:eventId" element={<EventLayout />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<EventOverviewPage />} />
              <Route path="guests" element={<GuestListPage />} />
              <Route path="guests/new" element={<GuestFormPage />} />
              <Route path="guests/import" element={<GuestImportPage />} />
              <Route path="guests/:guestId" element={<GuestFormPage />} />
              <Route path="invitations" element={<InvitationsPage />} />
              <Route path="gates" element={<GatesPage />} />
              <Route path="check-ins" element={<CheckInsPage />} />
              <Route path="staff" element={<StaffPage />} />
              <Route path="settings" element={<EventSettingsPage />} />
            </Route>
          </Route>
          <Route
            path="/scan/:eventId"
            element={
              <Suspense fallback={<div className="grid min-h-dvh place-items-center bg-ink text-sm text-white/70">Opening scanner…</div>}>
                <ScannerPage />
              </Suspense>
            }
          />
        </Route>
        <Route path="/i/:inviteToken" element={<InvitePage />} />
        <Route path="/r/:registerToken" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  )
}
