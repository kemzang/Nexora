'use client'

import * as React from "react"
import { useRef, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

// Anime au montage plutôt que d'attendre un déclenchement au scroll (ex-
// useInView) : sur cette section, un compteur resté bloqué à 0 (ex. jamais
// scrollée assez profondément, ou timing d'hydratation raté) donnait
// l'impression d'un site cassé/inactif — pire que pas d'animation du tout.
function useCounter(target: number, duration = 1600) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setValue(target); clearInterval(timer) }
      else setValue(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return value
}

interface StatCardProps {
  value: number
  suffix?: string
  label: string
  className?: string
}

export function StatCard({ value, suffix = "", label, className }: StatCardProps) {
  const ref = useRef(null)
  const count = useCounter(value, 1600)

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn("text-center", className)}
    >
      <p className="text-3xl sm:text-4xl font-bold gradient-text-strong mb-1">
        {count.toLocaleString()}{suffix}
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </motion.div>
  )
}
