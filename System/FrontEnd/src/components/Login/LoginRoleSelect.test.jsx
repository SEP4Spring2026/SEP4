import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { accessRoles } from "../../auth/accessControl.js";
import { LoginRoleSelect } from "./LoginRoleSelect.jsx";

describe("LoginRoleSelect", () => {
  it("renders available access roles", () => {
    render(
      <LoginRoleSelect
        roles={accessRoles}
        selectedRole="resident"
        onRoleChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Access role")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Resident/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Building administrator/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /System admin/ })).toBeInTheDocument();
  });

  it("calls onRoleChange when user selects another role", async () => {
    const user = userEvent.setup();
    const onRoleChange = vi.fn();

    render(
      <LoginRoleSelect
        roles={accessRoles}
        selectedRole="resident"
        onRoleChange={onRoleChange}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Access role"), "building-administrator");

    expect(onRoleChange).toHaveBeenCalledWith("building-administrator");
  });
});
