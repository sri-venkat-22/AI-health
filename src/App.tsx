import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PatientProvider } from "@/contexts/PatientContext";
import { RequireAuth } from "@/components/RequireAuth";
import Index from "./pages/Index.tsx";
import Intake from "./pages/Intake.tsx";
import Results from "./pages/Results.tsx";
import Clinician from "./pages/Clinician.tsx";
import Auth from "./pages/Auth.tsx";
import ClinicianDashboard from "./pages/ClinicianDashboard.tsx";
import PlanReview from "./pages/PlanReview.tsx";
import Interactions from "./pages/Interactions.tsx";
import PatientPortal from "./pages/PatientPortal.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <PatientProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/intake" element={<Intake />} />
                <Route path="/results" element={<Results />} />
                <Route path="/patient" element={<PatientPortal />} />
                <Route path="/clinician" element={<Clinician />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/interactions" element={<Interactions />} />
                <Route path="/clinician/dashboard" element={<RequireAuth><ClinicianDashboard /></RequireAuth>} />
                <Route path="/clinician/plan/:id" element={<RequireAuth><PlanReview /></RequireAuth>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </PatientProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
