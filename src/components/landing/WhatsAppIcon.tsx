interface WhatsAppIconProps {
  className?: string
}

export default function WhatsAppIcon({ className = "w-4 h-4" }: WhatsAppIconProps) {
  return (
    <img
      src="/imgs/icons/Whatsapp.png"
      alt=""
      aria-hidden="true"
      className={`${className} object-contain`}
    />
  )
}
