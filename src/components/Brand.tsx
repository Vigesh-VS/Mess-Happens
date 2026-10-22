/** The app's name with its chef-hat mark: used in the sidebar and on the sign-in pages. */
export function Brand({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-2xl font-extrabold tracking-tight ${className}`}>
      <img src="/brand/hat.png" alt="" width={48} height={48} className="size-8 shrink-0" />
      Mess Happens.
    </span>
  );
}
