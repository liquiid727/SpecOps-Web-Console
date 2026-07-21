import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { I18nProvider } from "./i18n";
import { FeedbackProvider } from "./components/ui/Feedback";
import { ThemeProvider } from "./theme";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(<I18nProvider><ThemeProvider><FeedbackProvider><App /></FeedbackProvider></ThemeProvider></I18nProvider>);
