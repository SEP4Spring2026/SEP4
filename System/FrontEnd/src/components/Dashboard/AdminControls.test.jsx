import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminControls } from "./AdminControls.jsx";

describe("AdminControls", () => {
  it("disables alarm buttons when all devices are selected", () => {
    render(
      <AdminControls
        selectedSensorId="all"
        alarmTestBusy={false}
        alarmTestMessage={null}
        onAlarmTest={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Critical pattern" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Short warn" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Silence" })).toBeDisabled();
    expect(screen.getByText("Alarm controls require one selected device.")).toBeInTheDocument();
  });

  it("disables alarm buttons while an alarm test is busy", () => {
    render(
      <AdminControls
        selectedSensorId="101"
        alarmTestBusy={true}
        alarmTestMessage={null}
        onAlarmTest={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Critical pattern" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Short warn" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Silence" })).toBeDisabled();
  });

  it("calls onAlarmTest with the selected alarm level", async () => {
    const user = userEvent.setup();
    const onAlarmTest = vi.fn();

    render(
      <AdminControls
        selectedSensorId="101"
        alarmTestBusy={false}
        alarmTestMessage={null}
        onAlarmTest={onAlarmTest}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Critical pattern" }));
    await user.click(screen.getByRole("button", { name: "Short warn" }));
    await user.click(screen.getByRole("button", { name: "Silence" }));

    expect(onAlarmTest).toHaveBeenNthCalledWith(1, "critical");
    expect(onAlarmTest).toHaveBeenNthCalledWith(2, "warn");
    expect(onAlarmTest).toHaveBeenNthCalledWith(3, "off");
  });

  it("renders error messages from alarm test results", () => {
    render(
      <AdminControls
        selectedSensorId="101"
        alarmTestBusy={false}
        alarmTestMessage={{ type: "error", text: "Backend unavailable" }}
        onAlarmTest={vi.fn()}
      />,
    );

    expect(screen.getByText("Backend unavailable")).toHaveClass("danger");
  });
});
