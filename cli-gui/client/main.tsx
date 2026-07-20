import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { I18nProvider } from "./i18n";
import { FeedbackProvider } from "./components/ui/Feedback";
import "./styles.css";

createRoot(document.getElementById("root")!).render(<I18nProvider><FeedbackProvider><App /></FeedbackProvider></I18nProvider>);
