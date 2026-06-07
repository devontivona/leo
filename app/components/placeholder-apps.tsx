// Placeholder content for Photos & Milestones, just enough to test the window
// chrome and the Platinum vocabulary inside a window. (My Schedule is now real —
// see app/components/schedule/.)
import { Well } from "./ui/well";

const INK = "#000000";

export function PhotosApp() {
  const cells = Array.from({ length: 9 });
  return (
    <div className="flex flex-col gap-2" style={{ width: "18rem", maxWidth: "100%" }}>
      <p className="text-small text-platinumDark">My Photos · 9 pictures</p>
      <Well>
        <div className="grid grid-cols-3 gap-1 p-1">
          {cells.map((_, i) => (
            <div
              key={i}
              className="grid aspect-square place-items-center text-small text-platinumDark"
              style={{ background: "#dededb", border: `1px solid #b8b8b3` }}
            >
              ◍
            </div>
          ))}
        </div>
      </Well>
    </div>
  );
}

export function MilestonesApp() {
  const items = [
    { done: true, label: "First smile" },
    { done: true, label: "Held head up" },
    { done: false, label: "Rolled over" },
    { done: false, label: "First laugh" },
  ];
  return (
    <div className="flex flex-col gap-2" style={{ width: "16rem", maxWidth: "100%" }}>
      <p className="text-small text-platinumDark">What I&apos;ve done</p>
      <Well>
        <ul>
          {items.map((m, i) => (
            <li
              key={m.label}
              className="flex items-center gap-2 px-2 py-1 text-body"
              style={{ borderTop: i === 0 ? "none" : `1px solid #e0e0e0` }}
            >
              <span aria-hidden>{m.done ? "☑" : "☐"}</span>
              <span style={{ color: m.done ? INK : "#777" }}>{m.label}</span>
            </li>
          ))}
        </ul>
      </Well>
    </div>
  );
}
