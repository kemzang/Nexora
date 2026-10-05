import Image from 'next/image'

/**
 * Logo Nexora.
 *
 * Les pages affichaient jusqu'ici un placeholder — une icone Sparkles de
 * Lucide posee sur un carre colore — duplique sur les quatre pages
 * d'authentification et dans l'en-tete. Ce composant centralise le vrai
 * logo pour que les cinq endroits restent coherents.
 *
 * Le fichier source est le meme que l'icone de l'extension VS Code, afin que
 * le site et le Marketplace montrent exactement la meme marque.
 */
export function BrandLogo({
  size = 56,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <Image
      src="/logo.png"
      alt="Nexora"
      width={size}
      height={size}
      priority
      className={`rounded-2xl shadow-xl ${className}`}
    />
  )
}
