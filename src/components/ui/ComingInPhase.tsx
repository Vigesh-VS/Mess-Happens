/** Marks a screen that is routed and laid out but filled in by a later build phase. */
export function ComingInPhase({ phase, children }: { phase: number; children: string }) {
  return (
    <section className="mt-10 border-t border-line pt-6">
      <p className="label">Phase {phase}</p>
      <p className="mt-2 max-w-prose text-lg text-muted">{children}</p>
    </section>
  );
}
