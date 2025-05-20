export function Button({ children, className = "", variant = "default", ...props }) {
    const base = "rounded-xl font-medium transition shadow-sm";
  
    const variants = {
      default: "bg-primary text-white hover:opacity-90",
      outline: "border border-primary text-primary bg-white hover:bg-gray-100",
    };
  
    return (
      <button className={`${base} ${variants[variant]} ${className}`} {...props}>
        {children}
      </button>
    );
  }
  