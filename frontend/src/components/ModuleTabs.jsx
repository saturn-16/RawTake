import JellyRadio from "./reactbits/JellyRadio.jsx";

// Sharp, mechanical push-and-settle tabs — jelly/bounce stripped down from
// React Bits' defaults to match the design system's "physical tab" feel
// rather than a soft bouncy pill switcher.
export default function ModuleTabs({ items, value, onChange }) {
  return (
    <JellyRadio
      items={items}
      value={value}
      onChange={onChange}
      ariaLabel="RawTake module"
      chipColor="#131417"
      activeColor="#f2f1ed"
      activeTextColor="#08090b"
      textColor="#9a9a9e"
      radius={4}
      bounce={0.05}
      jelly={0}
      swell={0.08}
      barge={2}
      shrink={0.02}
      stagger={12}
      className="module-tabs"
    />
  );
}
