import { getCurrentWindow, LogicalPosition } from "@tauri-apps/api/window";

// Manual window dragging for the frameless transparent window.
// Tauri's startDragging() silently no-ops here (the native drag event is
// already gone from the runloop by the time the IPC roundtrip lands),
// so we move the window ourselves following the cursor in screen coords.
let dragging = false;

export async function beginManualDrag(e: React.PointerEvent) {
  const el = e.target as HTMLElement | null;
  if (el?.closest?.("button, input, textarea, select, a, .no-drag")) return;
  if (e.button !== 0 || dragging) return;
  const win = getCurrentWindow();
  try {
    const [pos, scale] = await Promise.all([win.outerPosition(), win.scaleFactor()]);
    const startX = pos.x / scale;
    const startY = pos.y / scale;
    const sx = e.screenX;
    const sy = e.screenY;
    dragging = true;
    const move = (ev: PointerEvent) => {
      void win
        .setPosition(new LogicalPosition(startX + (ev.screenX - sx), startY + (ev.screenY - sy)))
        .catch(() => {});
    };
    const up = () => {
      dragging = false;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  } catch {
    dragging = false;
  }
}
