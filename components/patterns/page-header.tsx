import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface PageHeaderProps {
  badge?: string
  title: React.ReactNode
  subtitle?: string
  className?: string
  /**
   * Niveau du titre. 2 par defaut, car malgre son nom ce composant sert
   * partout de titre de SECTION, au-dessous du titre de la page.
   */
  level?: 1 | 2
}

/**
 * Il rendait un <h1>. Or il est utilise deux fois par page, sous un <h1>
 * deja present : /about et /pricing en comptaient donc TROIS chacune, ce qui
 * revient a dire a un moteur de recherche que « Ce qui guide le produit » est
 * aussi important que le sujet de la page. Le niveau est desormais 2, et
 * reste reglable pour la page ou ce composant porterait vraiment le titre.
 */
export function PageHeader({
  badge,
  title,
  subtitle,
  className,
  level = 2,
}: PageHeaderProps) {
  const Titre = level === 1 ? 'h1' : 'h2'
  return (
    <div className={cn("text-center mb-16", className)}>
      {badge && (
        <Badge variant="primary" className="mb-5">
          {badge}
        </Badge>
      )}
      <Titre className="text-3xl sm:text-5xl font-bold tracking-tight mb-4 text-balance">
        {title}
      </Titre>
      {subtitle && (
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
    </div>
  )
}
