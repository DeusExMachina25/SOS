import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import HoldToConfirm from "@/components/ui/HoldToConfirm";
import { ConfirmProvider, useConfirm, type ConfirmOptions } from "@/components/ui/ConfirmDialog";
import Receipt from "@/components/dashboard/Receipt";
import MagneticDropZone from "@/components/dashboard/MagneticDropZone";

afterEach(cleanup);

const holdKey = (el: HTMLElement) => fireEvent.keyDown(el, { key: " " });
const releaseKey = (el: HTMLElement) => fireEvent.keyUp(el, { key: " " });

describe("HoldToConfirm", () => {
  it("fires once the button has been held for the full time", async () => {
    const onConfirm = vi.fn();
    render(<HoldToConfirm label="Refund" holdMs={60} onConfirm={onConfirm} />);
    const btn = screen.getByRole("button", { name: "Hold to refund" });
    holdKey(btn);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it("does nothing when released early", async () => {
    const onConfirm = vi.fn();
    render(<HoldToConfirm label="Refund" holdMs={400} onConfirm={onConfirm} />);
    const btn = screen.getByRole("button", { name: "Hold to refund" });
    holdKey(btn);
    releaseKey(btn);
    await new Promise((r) => setTimeout(r, 500));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

function Asker({ opts, onResult }: { opts: ConfirmOptions; onResult: (ok: boolean) => void }) {
  const confirm = useConfirm();
  return <button onClick={async () => onResult(await confirm(opts))}>ask</button>;
}

describe("ConfirmDialog", () => {
  it("resolves false when cancelled", async () => {
    const onResult = vi.fn();
    render(
      <ConfirmProvider>
        <Asker opts={{ title: "Delete plan.pdf?", action: "Delete" }} onResult={onResult} />
      </ConfirmProvider>
    );
    fireEvent.click(screen.getByText("ask"));
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });

  it("resolves true after the hold when there is no undo window", async () => {
    const onResult = vi.fn();
    render(
      <ConfirmProvider>
        <Asker opts={{ title: "Refund?", action: "Refund", undoSeconds: 0 }} onResult={onResult} />
      </ConfirmProvider>
    );
    fireEvent.click(screen.getByText("ask"));
    holdKey(await screen.findByRole("button", { name: "Hold to refund" }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true), { timeout: 3000 });
  });

  it("lets the person undo before anything runs", async () => {
    const onResult = vi.fn();
    render(
      <ConfirmProvider>
        <Asker opts={{ title: "Refund?", action: "Refund", undoSeconds: 3 }} onResult={onResult} />
      </ConfirmProvider>
    );
    fireEvent.click(screen.getByText("ask"));
    holdKey(await screen.findByRole("button", { name: "Hold to refund" }));
    const undo = await screen.findByText("Undo", {}, { timeout: 3000 });
    await act(async () => fireEvent.click(undo));
    expect(onResult).toHaveBeenCalledWith(false);
  });

  it("falls back to the browser confirm outside a provider", async () => {
    const onResult = vi.fn();
    const spy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Asker opts={{ title: "Refund?", message: "Money goes back.", action: "Refund" }} onResult={onResult} />);
    fireEvent.click(screen.getByText("ask"));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    expect(spy).toHaveBeenCalledWith("Refund?\n\nMoney goes back.");
    spy.mockRestore();
  });
});

describe("Receipt", () => {
  it("prints the details, lines, total and stamp", () => {
    render(
      <Receipt
        heading="Booking summary"
        details={[{ label: "Expert", value: "Dr. Sarah Jenkins" }]}
        lines={[{ label: "Session fee", value: "₹2,500" }]}
        total={{ label: "Due now", value: "₹2,500" }}
        stamp={{ text: "Not paid", tone: "due" }}
      />
    );
    expect(screen.getByText("Dr. Sarah Jenkins")).toBeTruthy();
    expect(screen.getByText("Due now")).toBeTruthy();
    expect(screen.getAllByText("₹2,500")).toHaveLength(2);
    expect(screen.getByText("Not paid")).toBeTruthy();
  });
});

describe("MagneticDropZone", () => {
  it("hands dropped files to onFiles and still opens the picker on click", () => {
    const onFiles = vi.fn();
    const onClick = vi.fn();
    render(<MagneticDropZone onFiles={onFiles} onClick={onClick} icon={null} title="Upload to Vault" hint="Drag files here" />);
    const zone = screen.getByRole("button", { name: /Upload to Vault/ });
    const file = new File(["hello"], "plan.pdf", { type: "application/pdf" });
    fireEvent.drop(zone, { dataTransfer: { files: [file], types: ["Files"] } });
    expect(onFiles).toHaveBeenCalledWith([file]);
    fireEvent.click(zone);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("ignores drops while disabled", () => {
    const onFiles = vi.fn();
    render(<MagneticDropZone disabled onFiles={onFiles} onClick={() => {}} icon={null} title="Uploading…" hint="" />);
    const file = new File(["x"], "a.png");
    fireEvent.drop(screen.getByRole("button"), { dataTransfer: { files: [file], types: ["Files"] } });
    expect(onFiles).not.toHaveBeenCalled();
  });
});
