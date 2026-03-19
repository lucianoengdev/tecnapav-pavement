import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Results from "./pages/Results";
import Help from "./pages/Help";
import TemplateHelp from "./pages/TemplateHelp";
import InventoryHelper from "./pages/InventoryHelper";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/results"} component={Results} />
      <Route path={"/help"} component={Help} />
      <Route path={"/templates-guide"} component={TemplateHelp} />
      <Route path={"/inventory-helper"} component={InventoryHelper} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
