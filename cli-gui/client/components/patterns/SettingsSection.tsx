import type { ReactNode } from "react";

export function SettingsSection({ children, description, title }: { children?: ReactNode; description?: ReactNode; title: ReactNode }) { return <section className="settings-section"><h3>{title}</h3>{description && <p className="settings-description">{description}</p>}{children}</section>; }
