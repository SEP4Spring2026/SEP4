import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RestrictedNotice } from "./RestrictedNotice.jsx";

describe("RestrictedNotice", () => {
  it("renders the default restricted area message", () => {
    render(<RestrictedNotice />);

    expect(screen.getByRole("heading", { name: "Restricted area" })).toBeInTheDocument();
    expect(
      screen.getByText("This action is available only to building administrators in the demo role model."),
    ).toBeInTheDocument();
  });

  it("renders a custom restriction message", () => {
    render(<RestrictedNotice message="Settings are available to building administrators and above." />);

    expect(screen.getByText("Settings are available to building administrators and above.")).toBeInTheDocument();
  });
});
