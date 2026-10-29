import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Dashboard from '@/pages/Dashboard';
import MyWork from '@/pages/MyWork';
import RiskRegister from '@/pages/RiskRegister';
import ProjectChange from '@/pages/ProjectChange';
import Departments from '@/pages/Departments';
import Controls from '@/pages/Controls';
import KriDashboard from '@/pages/KriDashboard';
import ActionsTracker from '@/pages/ActionsTracker';
import Incidents from '@/pages/Incidents';
import Conflicts from '@/pages/Conflicts';
import GiftsHospitality from '@/pages/GiftsHospitality';
import GiftsHospitalityReport from '@/pages/GiftsHospitalityReport';
import ThirdParties from '@/pages/ThirdParties';
import Appetite from '@/pages/Appetite';
import EmergingRisks from '@/pages/EmergingRisks';
import AuditTrail from '@/pages/AuditTrail';
import Employees from '@/pages/Employees';
import ErcPack from '@/pages/ErcPack';
import Attestations from '@/pages/Attestations';
import MyAttestations from '@/pages/MyAttestations';
import AttestationReport from '@/pages/AttestationReport';
import Permissions from '@/pages/Permissions';
import Administration from '@/pages/Administration';
import ReportBuilder from '@/pages/ReportBuilder';
import { PermissionsProvider } from '@/lib/permissions';
import BoardGovernance from '@/pages/BoardGovernance';
import MeetingDetail from '@/pages/MeetingDetail';
import BoardActionsTracker from '@/pages/BoardActionsTracker';
import MyBoardActions from '@/pages/MyBoardActions';
import Committees from '@/pages/Committees';
import AttendanceReport from '@/pages/AttendanceReport';
import PolicyLibrary from '@/pages/PolicyLibrary';
import PolicyReport from '@/pages/PolicyReport';
import InsuranceLibrary from '@/pages/InsuranceLibrary';
import InsuranceReport from '@/pages/InsuranceReport';
import Layout from '@/components/Layout';
import PublicAttestation from '@/pages/PublicAttestation';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <PermissionsProvider>
    <Routes>
      {/* Add your page Route elements here */}
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/my-work" element={<MyWork />} />
        <Route path="/risk-register" element={<RiskRegister />} />
        <Route path="/project-change" element={<ProjectChange />} />
        <Route path="/departments" element={<Departments />} />
        <Route path="/controls" element={<Controls />} />
        <Route path="/kri-dashboard" element={<KriDashboard />} />
        <Route path="/actions" element={<ActionsTracker />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/conflicts" element={<Conflicts />} />
        <Route path="/gifts-hospitality" element={<GiftsHospitality />} />
        <Route path="/gifts-hospitality-report" element={<GiftsHospitalityReport />} />
        <Route path="/third-parties" element={<ThirdParties />} />
        <Route path="/appetite" element={<Appetite />} />
        <Route path="/emerging-risks" element={<EmergingRisks />} />
        <Route path="/audit-trail" element={<AuditTrail />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/erc-pack" element={<ErcPack />} />
        <Route path="/attestations" element={<Attestations />} />
        <Route path="/my-attestations" element={<MyAttestations />} />
        <Route path="/attestation-report" element={<AttestationReport />} />
        <Route path="/permissions" element={<Permissions />} />
        <Route path="/administration" element={<Administration />} />
        <Route path="/reports" element={<ReportBuilder />} />
        <Route path="/board-governance" element={<BoardGovernance />} />
        <Route path="/board-governance/meeting/:id" element={<MeetingDetail />} />
        <Route path="/board-actions" element={<BoardActionsTracker />} />
        <Route path="/my-board-actions" element={<MyBoardActions />} />
        <Route path="/committees" element={<Committees />} />
        <Route path="/attendance-report" element={<AttendanceReport />} />
        <Route path="/policy-library" element={<PolicyLibrary />} />
        <Route path="/policy-report" element={<PolicyReport />} />
        <Route path="/insurance-library" element={<InsuranceLibrary />} />
        <Route path="/insurance-report" element={<InsuranceReport />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </PermissionsProvider>
  );
};


function AppShell() {
  const { pathname } = useLocation();
  // Public, no-login attestation completion via magic link — rendered outside
  // AuthProvider so responders never hit a login redirect.
  if (pathname.startsWith("/attest/")) {
    const token = decodeURIComponent(pathname.slice("/attest/".length));
    return <PublicAttestation token={token} />;
  }
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <ScrollToTop />
        <AppShell />
      </Router>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App