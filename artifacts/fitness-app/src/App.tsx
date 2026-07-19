import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { ThemeProvider } from './components/theme-provider';
import { AuthProvider } from './components/auth-provider';
import { ProtectedRoute } from './components/protected-route';
import { AppLayout } from './components/layout';

// Pages
import LandingPage from './pages/landing';
import LoginPage from './pages/login';
import SignupPage from './pages/signup';
import OnboardingPage from './pages/onboarding';
import DashboardPage from './pages/dashboard';
import WorkoutsPage from './pages/workouts';
import WorkoutDetailPage from './pages/workout-detail';
import WorkoutBuilderPage from './pages/workout-builder';
import WorkoutActivePage from './pages/workout-active';
import WorkoutSchedulePage from './pages/workout-schedule';
import WorkoutAnalyticsPage from './pages/workout-analytics';
import WorkoutCalendarPage from './pages/workout-calendar';
import ExercisesPage from './pages/exercises';
import NutritionPage from './pages/nutrition';
import ProgressPage from './pages/progress';
import ProgressPhotosPage from './pages/progress-photos';
import AiCoachPage from './pages/ai-coach';
import AiWorkoutGeneratorPage from './pages/ai-workout-generator';
import RecoveryPage from './pages/recovery';
import ProfilePage from './pages/profile';
import GoalsPage from './pages/goals';
import MonthlyReportPage from './pages/monthly-report';
import WeeklySummaryPage from './pages/weekly-summary';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthenticatedRoutes() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/workouts" component={WorkoutsPage} />
        <Route path="/workouts/builder" component={WorkoutBuilderPage} />
        <Route path="/workouts/builder/:id" component={WorkoutBuilderPage} />
        <Route path="/workouts/schedule" component={WorkoutSchedulePage} />
        <Route path="/workouts/calendar" component={WorkoutCalendarPage} />
        <Route path="/workouts/analytics" component={WorkoutAnalyticsPage} />
        <Route path="/workouts/:id/active" component={WorkoutActivePage} />
        <Route path="/workouts/:id" component={WorkoutDetailPage} />
        <Route path="/exercises" component={ExercisesPage} />
        <Route path="/nutrition" component={NutritionPage} />
        <Route path="/progress/weekly-summary" component={WeeklySummaryPage} />
        <Route path="/progress/monthly-report" component={MonthlyReportPage} />
        <Route path="/progress" component={ProgressPage} />
        <Route path="/progress-photos" component={ProgressPhotosPage} />
        <Route path="/recovery" component={RecoveryPage} />
        <Route path="/ai/generate" component={AiWorkoutGeneratorPage} />
        <Route path="/ai" component={AiCoachPage} />
        <Route path="/goals" component={GoalsPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      
      {/* Protected Routes Wrapper */}
      <Route path="/:rest*">
        <ProtectedRoute>
          <Switch>
            <Route path="/onboarding" component={OnboardingPage} />
            <Route path="/:rest*" component={AuthenticatedRoutes} />
          </Switch>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
