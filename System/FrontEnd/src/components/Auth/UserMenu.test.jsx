import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UserMenu } from "./UserMenu.jsx";

describe("UserMenu", () => {
  it("renders the current user's role", () => {
    render(
      <UserMenu
        session={{ role: "building-administrator" }}
        onLogout={vi.fn()}
      />,
    );

    expect(screen.getByText("BA")).toBeInTheDocument();
    expect(screen.getByText("Building admin")).toBeInTheDocument();
  });

  it("calls onLogout when the logout button is clicked", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();

    render(
      <UserMenu
        session={{ role: "resident" }}
        onLogout={onLogout}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Logout" }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
