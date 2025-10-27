export default function Card({ children, className = "" }) {
  return (
    <div
      className={[
        "rounded-2xl border border-black/10",
        "bg-white/70 backdrop-blur",
        "shadow-sm hover:shadow-md transition-shadow",
        "p-4 sm:p-5",
        "w-full max-w-[720px]", // se adapta al ancho pero mantiene centro
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}