import { render } from "@testing-library/react";
import { screen, fireEvent, waitFor } from "@testing-library/dom";
import { describe, expect, it } from "vitest";
import { App } from "./main";

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
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /New journey/i }));
    expect(screen.getByRole("dialog")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
