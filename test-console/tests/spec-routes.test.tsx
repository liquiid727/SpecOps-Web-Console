import React from "react";
import { render, screen } from "@testing-library/react";
import PlanPage from "@/app/spec/[specId]/plan/page";
import ApiPage from "@/app/spec/[specId]/api/page";
import ScenarioPage from "@/app/spec/[specId]/scenario/page";
import PerformancePage from "@/app/spec/[specId]/performance/page";
import ConcurrencyPage from "@/app/spec/[specId]/concurrency/page";
import GatesPage from "@/app/spec/[specId]/gates/page";
import SpecPage from "@/app/spec/[specId]/page";

const params = Promise.resolve({ specId: "R002-goalspec-console/S01-evidence-console" });

describe("spec test console routes", () => {
  it("renders the developer test loop homepage", async () => {
    const page = await SpecPage({ params });
    render(page);
    expect(screen.getByText("Developer Test Loop")).toBeInTheDocument();
    expect(screen.getByText("Run Panel")).toBeInTheDocument();
    expect(screen.getByText("Failure Inspector")).toBeInTheDocument();
    expect(screen.getByText("Run Session Timeline")).toBeInTheDocument();
    expect(screen.getByText("Session State")).toBeInTheDocument();
    expect(screen.getByText("stale")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Test Plan" })).toHaveAttribute("href", "/spec/R002-goalspec-console/S01-evidence-console/plan");
    expect(screen.getByRole("link", { name: "API Tests" })).toHaveAttribute("href", "/spec/R002-goalspec-console/S01-evidence-console/api");
    expect(screen.getByRole("link", { name: "Scenario / E2E" })).toHaveAttribute("href", "/spec/R002-goalspec-console/S01-evidence-console/scenario");
    expect(screen.getByRole("link", { name: "Performance" })).toHaveAttribute("href", "/spec/R002-goalspec-console/S01-evidence-console/performance");
    expect(screen.getByRole("link", { name: "Concurrency" })).toHaveAttribute("href", "/spec/R002-goalspec-console/S01-evidence-console/concurrency");
    expect(screen.getByRole("link", { name: "Gate Report" })).toHaveAttribute("href", "/spec/R002-goalspec-console/S01-evidence-console/gates");
    expect(screen.getByRole("option", { name: "All scopes" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Performance" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Concurrency" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Gate" })).toBeInTheDocument();
    expect(screen.getByText("GoalSpec Evidence Console")).toBeInTheDocument();
  });

  it("renders the dedicated test plan route", async () => {
    const page = await PlanPage({ params });
    render(page);
    expect(screen.getByText("Test Plan Matrix")).toBeInTheDocument();
    expect(screen.getByText("Production Standard Compliance")).toBeInTheDocument();
    expect(screen.getByText("Endpoints")).toBeInTheDocument();
    expect(screen.getByText("Scenarios")).toBeInTheDocument();
  });

  it("renders the dedicated API route", async () => {
    const page = await ApiPage({ params });
    render(page);
    expect(screen.getByText("API Test View")).toBeInTheDocument();
    expect(screen.getByText("Swagger-like endpoint visibility with SpecOS test semantics.")).toBeInTheDocument();
    expect(screen.getAllByText(/goalspec\.evidence\.index/).length).toBeGreaterThan(0);
  });

  it("renders the dedicated scenario route", async () => {
    const page = await ScenarioPage({ params });
    render(page);
    expect(screen.getByText("Scenario / E2E View")).toBeInTheDocument();
    expect(screen.getByText("Scenario Chains")).toBeInTheDocument();
  });

  it("renders the dedicated performance route", async () => {
    const page = await PerformancePage({ params });
    render(page);
    expect(screen.getByText("Performance / Latency")).toBeInTheDocument();
    expect(screen.getByText("SLO Results")).toBeInTheDocument();
    expect(screen.getByText(/performance-test-agent/)).toBeInTheDocument();
  });

  it("renders the dedicated concurrency route", async () => {
    const page = await ConcurrencyPage({ params });
    render(page);
    expect(screen.getByText("Concurrency / Consistency")).toBeInTheDocument();
    expect(screen.getByText("Invariant Results")).toBeInTheDocument();
    expect(screen.getByText(/concurrency-test-agent/)).toBeInTheDocument();
  });

  it("renders the dedicated gates route", async () => {
    const page = await GatesPage({ params });
    render(page);
    expect(screen.getByText("Gate Report")).toBeInTheDocument();
    expect(screen.getByText("Required Gates")).toBeInTheDocument();
    expect(screen.getByText("Standard Compliance")).toBeInTheDocument();
    expect(screen.getByText("Risk Summary")).toBeInTheDocument();
    expect(screen.getByText("Agent Evidence Summary")).toBeInTheDocument();
  });
});
