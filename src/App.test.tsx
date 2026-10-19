import { cleanup, render } from "@testing-library/react";
import { screen, fireEvent, waitFor } from "@testing-library/dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./main";

beforeEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, "", "#overview");
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:test"),
    revokeObjectURL: vi.fn(),
  });
  vi.stubGlobal("navigator", {
    ...navigator,
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe("A11yPilot demo journey", () => {
  it("lets a user switch from broken to fixed and run the recovery journey", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Fixed" }));
    fireEvent.click(screen.getByRole("button", { name: /Run this journey/i }));
    await waitFor(
      () => expect(screen.getByText("Journey passed")).toBeVisible(),
      { timeout: 1500 },
    );
    expect(
      screen.getByText("All 4 steps completed with no barriers."),
    ).toBeVisible();
  });

  it("opens and closes the new journey dialog", () => {
    window.history.replaceState(null, "", "#journeys");
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /New journey/i }));
    expect(screen.getByRole("dialog")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("navigates between pages with hash links", async () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: /Open interactive workspace/i }),
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Journeys" })).toBeVisible(),
    );
    expect(window.location.hash).toBe("#journeys");
    expect(screen.getByRole("heading", { name: "Journeys" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Run history" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Run history" }),
      ).toBeVisible(),
    );
  });

  it("creates a journey from the guided method", async () => {
    window.history.replaceState(null, "", "#journeys");
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /New journey/i }));
    fireEvent.change(screen.getByLabelText("Journey name"), {
      target: { value: "Invite a teammate" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create journey/i }));
    await waitFor(() =>
      expect(screen.getAllByText("Invite a teammate").length).toBeGreaterThan(
        0,
      ),
    );
    expect(window.location.hash).toBe("#journeys");
  });

  it("filters journeys and records export interactions", async () => {
    window.history.replaceState(null, "", "#journeys");
    render(<App />);
    await waitFor(() =>
      expect(screen.getByLabelText("Search journeys")).toBeVisible(),
    );
    fireEvent.change(screen.getByLabelText("Search journeys"), {
      target: { value: "dialog" },
    });
    expect(screen.getByText("Open and close a dialog")).toBeVisible();
    expect(screen.queryByText("Create an account")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Run history" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "JSON" })).toBeVisible(),
    );
    fireEvent.click(screen.getByRole("button", { name: "JSON" }));
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("saves settings and searches documentation/copies command", async () => {
    window.history.replaceState(null, "", "#settings");
    render(<App />);
    await waitFor(() =>
      expect(screen.getByLabelText("Workspace name")).toBeVisible(),
    );
    fireEvent.change(screen.getByLabelText("Workspace name"), {
      target: { value: "New workspace" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
    expect(screen.getByRole("status")).toHaveTextContent("Settings saved");
    window.history.replaceState(null, "", "#docs");
    fireEvent(window, new HashChangeEvent("hashchange"));
    await waitFor(() =>
      expect(screen.getByLabelText("Search documentation")).toBeVisible(),
    );
    fireEvent.change(screen.getByLabelText("Search documentation"), {
      target: { value: "command" },
    });
    expect(screen.getByText(/Validate and run journeys/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Copy command" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Copied" })).toBeVisible(),
    );
  });

  it("closes the creation modal with Escape", () => {
    window.history.replaceState(null, "", "#journeys");
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /New journey/i }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
