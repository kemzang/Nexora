import { redirect } from 'next/navigation'

/**
 * `/contact` menait a deux liens `mailto:` et rien d'autre.
 *
 * Deux defauts : un clic sur `mailto:` ne fait rien sur une machine sans
 * client mail configure, et surtout aucune demande n'etait enregistree chez
 * nous — un transfert casse ou un message en indesirable disparaissait sans
 * que nous sachions qu'il avait existe.
 *
 * `/support` fait le meme travail en gardant une trace. L'ancienne adresse
 * est conservee pour ne pas casser les liens deja publies.
 */
export default function ContactPage() {
  redirect('/support')
}
