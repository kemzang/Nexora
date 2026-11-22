import { BrandLogo } from '@/components/patterns/brand-logo'

/**
 * L'ecran d'attente qui occupe toute la page.
 *
 * Il y en avait onze, tous differents : un anneau de 6 px ici, de 12 px
 * la, parfois un texte, parfois rien. Le pire etait celui du tableau de
 * bord — un cercle qui tourne sur fond noir, sans un mot. Au-dela de
 * quelques secondes, une attente sans repere ne se lit pas comme une
 * attente : elle se lit comme une page cassee, et l'on recharge.
 *
 * Le logo dit chez qui l'on se trouve, le message dit ce qu'on attend.
 * Les deux coutent une ligne et evitent un rechargement.
 *
 * `plein` place le nom en bas de l'ecran, a la facon d'un demarrage
 * d'application. Reserve aux pages ou l'attente peut durer — un tableau
 * de bord, une caisse. Ailleurs, le bloc centre suffit : signer une
 * redirection d'une seconde en fait un evenement.
 */
export function LoadingScreen({
  message,
  plein = false,
  size = 56,
}: {
  message?: string
  plein?: boolean
  size?: number
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-7 px-6 text-center">
      <BrandLogo size={size} />

      <div className="relative h-9 w-9">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-foreground/70 border-t-transparent" />
        {/* Le second anneau tourne a l'envers : une seule couronne sur un
            fond uni donne l'impression d'etre figee. */}
        <div
          className="absolute inset-0 h-9 w-9 animate-spin rounded-full border-2 border-foreground/40 border-b-transparent"
          style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}
        />
      </div>

      {message && <p className="text-base text-muted-foreground">{message}</p>}

      {plein && (
        <div className="absolute bottom-12 flex flex-col items-center">
          <span className="text-xl font-bold tracking-tight gradient-text-strong">
            Nexora
          </span>
        </div>
      )}
    </div>
  )
}
