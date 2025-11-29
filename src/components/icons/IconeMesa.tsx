type IconeMesaProps = {
  className?: string
}

export default function IconeMesa({ className = 'w-6 h-6' }: IconeMesaProps) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Tampo da mesa */}
      <rect 
        x="2" 
        y="8" 
        width="20" 
        height="3" 
        rx="1" 
        fill="currentColor"
      />
      {/* Perna esquerda */}
      <rect 
        x="4" 
        y="11" 
        width="2.5" 
        height="9" 
        rx="0.5" 
        fill="currentColor"
      />
      {/* Perna direita */}
      <rect 
        x="17.5" 
        y="11" 
        width="2.5" 
        height="9" 
        rx="0.5" 
        fill="currentColor"
      />
      {/* Base esquerda */}
      <rect 
        x="2" 
        y="19" 
        width="6" 
        height="2" 
        rx="0.5" 
        fill="currentColor"
      />
      {/* Base direita */}
      <rect 
        x="16" 
        y="19" 
        width="6" 
        height="2" 
        rx="0.5" 
        fill="currentColor"
      />
      {/* Detalhe superior (prato/decoração) */}
      <circle 
        cx="12" 
        cy="5.5" 
        r="2" 
        stroke="currentColor" 
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  )
}
