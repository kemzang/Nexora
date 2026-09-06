export type Lang = 'fr' | 'en' | 'es' | 'pt'

export type Translations = {
  langName: string
  flag: string
  nav: {
    features: string
    pricing: string
    docs: string
    login: string
    start: string
  }
  hero: {
    badge: string
    title1: string
    title2: string
    desc: string
    cta: string
    demo: string
    stats: [string, string, string, string]
  }
  features: {
    badge: string
    title: string
    subtitle: string
    items: { title: string; desc: string }[]
  }
  statsSection: {
    poweredBy: string
  }
  faq: {
    badge: string
    title: string
    subtitle: string
    items: { q: string; a: string }[]
  }
  comparison: {
    badge: string
    title: string
    subtitle: string
    feature: string
    rows: { label: string; nexora: string; copilot: string; cursor: string }[]
  }
  pricing: {
    badge: string
    title: string
    subtitle: string
    popular: string
    cta: Record<string, string>
    planFeatures: Record<string, string[]>
    period: string
    models: Record<string, string>
  }
  cta: { title: string; subtitle: string; button: string }
  footer: {
    desc: string
    cols: { title: string; links: { label: string; href: string }[] }[]
    rights: string
  }
  checkout: {
    back: string
    planSelected: string
    title: string
    subtitle: string
    country: string
    method: string
    card: string
    momo: string
    phone: string
    phonePlaceholder: string
    cardName: string
    cardNumber: string
    expiry: string
    cvv: string
    operator: string
    accepted: string
    submit: string
    submitFree: string
    processing: string
    securePayment: string
    tls: string
    searchCountry: string
    noCountry: string
    holder: string
    exp: string
    digits: string
    valid: string
    mobilePrompt: string
    errors: {
      cardName: string
      cardNumber: string
      expiry: string
      expiryMonth: string
      expired: string
      cvv: string
      phone: string
      phoneLength: string
      operator: string
      duplicate: string
      connection: string
      initError: string
    }
  }
}

const fr: Translations = {
  langName: 'Français',
  flag: '🇫🇷',
  nav: {
    features: 'Fonctionnalités',
    pricing: 'Tarifs',
    docs: 'Documentation',
    login: 'Connexion',
    start: 'Commencer',
  },
  hero: {
    badge: 'IA de nouvelle génération pour VS Code',
    title1: "L'IA qui transforme",
    title2: 'votre façon de coder',
    desc: "Nexora s'intègre directement dans VS Code pour vous donner accès aux modèles d'IA les plus puissants. Codez plus vite, mieux, et avec plus de confiance.",
    cta: 'Essayer gratuitement',
    demo: 'Voir la démo',
    stats: ['Claude & Gemini', 'DeepSeek V3', '10x plus rapide', 'Code sécurisé'],
  },
  features: {
    badge: 'Fonctionnalités',
    title: 'Tout ce dont vous avez besoin',
    subtitle: 'Des outils puissants pour accélérer votre développement au quotidien',
    items: [
      { title: 'Chat IA Intégré', desc: "Discutez avec l'IA directement dans VS Code pour obtenir de l'aide et des suggestions en temps réel." },
      { title: 'Auto-complétion', desc: 'Complétez votre code 10x plus vite avec des suggestions intelligentes qui comprennent le contexte.' },
      { title: 'Génération de Code', desc: 'Générez des fonctions, des classes et des algorithmes complets à partir de descriptions en langage naturel.' },
      { title: 'Multi-modèles', desc: "Accédez à Claude, Gemini, DeepSeek et bien d'autres modèles depuis un seul outil." },
      { title: 'Mode Agent', desc: "Laissez l'IA exécuter des tâches complexes, naviguer dans votre code et proposer des modifications." },
      { title: 'Sécurité & Privacy', desc: "Vos données sont chiffrées et jamais utilisées pour l'entraînement. Contrôle total sur votre code." },
    ],
  },
  statsSection: {
    poweredBy: 'Propulsé par les meilleurs modèles IA',
  },
  faq: {
    badge: 'FAQ',
    title: 'Questions fréquentes',
    subtitle: 'Tout ce qu\'il faut savoir avant de commencer',
    items: [
      {
        q: 'Ai-je besoin d\'un abonnement séparé aux APIs des modèles IA ?',
        a: 'Non. Ton abonnement Nexora inclut l\'accès aux modèles (DeepSeek, Gemini, Claude selon le plan) — aucune clé API à fournir ni facture séparée chez les fournisseurs.',
      },
      {
        q: 'Mon code est-il stocké ou utilisé pour entraîner des modèles ?',
        a: 'Non. Tes données sont chiffrées en transit et ne sont jamais utilisées pour entraîner un modèle, ni par Nexora ni par les fournisseurs d\'IA connectés.',
      },
      {
        q: 'Puis-je changer de plan ou annuler à tout moment ?',
        a: 'Oui, sans engagement. Un changement de plan s\'applique immédiatement, et l\'annulation du renouvellement automatique te laisse l\'accès jusqu\'à la fin de la période déjà payée.',
      },
      {
        q: 'Nexora fonctionne-t-il seulement sur VS Code ?',
        a: 'Non — Nexora est aussi disponible sur toute la suite JetBrains (IntelliJ IDEA, PyCharm, WebStorm...) et en ligne de commande (CLI) pour les scripts et le CI/CD.',
      },
      {
        q: 'Que se passe-t-il si je dépasse mon quota mensuel de crédits ?',
        a: 'Tu es prévenu dans le tableau de bord dès que tu approches de la limite. Le quota se réinitialise chaque mois, et tu peux upgrader à tout moment pour en obtenir davantage.',
      },
    ],
  },
  comparison: {
    badge: 'Comparatif',
    title: 'Pourquoi choisir Nexora',
    subtitle: 'Comparaison basée sur les offres publiques au moment de la rédaction, susceptible d\'évoluer.',
    feature: 'Fonctionnalité',
    rows: [
      { label: 'Choix du modèle (Claude, Gemini, DeepSeek...)', nexora: 'Oui', copilot: 'Limité', cursor: 'Limité' },
      { label: 'Fonctionne dans ton IDE existant (VS Code, JetBrains)', nexora: 'Oui', copilot: 'Oui', cursor: 'Non (IDE dédié)' },
      { label: 'Mode Agent autonome', nexora: 'Oui', copilot: 'Partiel', cursor: 'Oui' },
      { label: 'Agent en ligne de commande (CLI)', nexora: 'Oui', copilot: 'Limité', cursor: 'Oui' },
      { label: 'Plan gratuit sans carte bancaire', nexora: 'Oui', copilot: 'Oui', cursor: 'Limité' },
      { label: 'Support JetBrains complet', nexora: 'Oui', copilot: 'Oui', cursor: 'Non' },
    ],
  },
  pricing: {
    badge: 'Tarifs',
    title: 'Des tarifs pour tous les besoins',
    subtitle: 'Commencez gratuitement et passez à un plan supérieur quand vous êtes prêt',
    popular: 'Populaire',
    period: '/mois',
    cta: {
      free: 'Commencer',
      starter: 'Choisir Starter',
      pro: 'Choisir Pro',
      business: 'Choisir Business',
      enterprise: 'Contacter',
    },
    models: {
      free: 'DeepSeek, Gemini Flash',
      starter: 'DeepSeek, Gemini Flash/Pro',
      pro: 'DeepSeek, Gemini, Claude Haiku & Sonnet',
      business: 'DeepSeek, Gemini, Claude Haiku/Sonnet/Opus',
      enterprise: 'Tous les modèles',
    },
    planFeatures: {
      free: ['100 000 crédits/mois', '200 requêtes/jour', 'DeepSeek, Gemini Flash'],
      starter: ['4M crédits/mois', '500 requêtes/jour', '+ Gemini Pro', 'Autocomplétion illimitée'],
      pro: ['15M crédits/mois', '2 000 requêtes/jour', '+ Claude Haiku & Sonnet', 'Mode Agent', 'Support prioritaire'],
      business: ['40M crédits/mois', '5 000 requêtes/jour', '+ Claude Opus', 'Mode équipe', 'Support prioritaire'],
      enterprise: ['100M crédits/mois', 'Requêtes illimitées', 'Tous les modèles', 'SSO + Support 24/7'],
    },
  },
  cta: {
    title: 'Prêt à transformer votre code ?',
    subtitle: 'Rejoignez des milliers de développeurs qui codent plus intelligemment avec Nexora.',
    button: 'Commencer gratuitement',
  },
  footer: {
    desc: "L'extension VS Code qui transforme votre code avec l'intelligence artificielle.",
    cols: [
      { title: 'Produit', links: [
        { label: 'Fonctionnalités', href: '/#features' },
        { label: 'Tarifs', href: '/pricing' },
        { label: 'Documentation', href: '/docs' },
        { label: 'Changelog', href: '/changelog' },
      ] },
      { title: 'Entreprise', links: [
        { label: 'À propos', href: '/about' },
        { label: 'Contact', href: '/contact' },
      ] },
      { title: 'Légal', links: [
        { label: 'Confidentialité', href: '/privacy' },
        { label: 'CGU', href: '/terms' },
      ] },
    ],
    rights: 'Tous droits réservés.',
  },
  checkout: {
    back: 'Retour aux tarifs',
    planSelected: 'Plan sélectionné',
    title: 'Paiement sécurisé',
    subtitle: 'Vos données sont protégées par chiffrement TLS',
    country: 'Pays',
    method: 'Méthode de paiement',
    card: 'Carte bancaire',
    momo: 'Mobile Money',
    phone: 'Numéro de téléphone',
    phonePlaceholder: 'Votre numéro',
    cardName: 'Nom du titulaire',
    cardNumber: 'Numéro de carte',
    expiry: "Date d'expiration",
    cvv: 'CVV / CVC',
    operator: 'Opérateur Mobile Money',
    accepted: 'Cartes acceptées :',
    submit: 'Payer',
    submitFree: 'Activer gratuitement',
    processing: 'Traitement en cours...',
    securePayment: 'Paiement sécurisé',
    tls: 'Chiffrement TLS',
    searchCountry: 'Rechercher un pays...',
    noCountry: 'Aucun pays trouvé',
    holder: 'Titulaire',
    exp: 'Exp.',
    digits: 'chiffres',
    valid: '✓ Valide',
    mobilePrompt: 'Validez le paiement sur votre téléphone',
    errors: {
      cardName: 'Veuillez saisir le nom du titulaire',
      cardNumber: 'Numéro de carte incomplet (16 chiffres requis)',
      expiry: "Date d'expiration invalide (MM/AA)",
      expiryMonth: "Mois d'expiration invalide",
      expired: 'Carte expirée',
      cvv: 'CVV incomplet (3 chiffres requis)',
      phone: 'Numéro de téléphone requis',
      phoneLength: 'Le numéro doit contenir {length} chiffres',
      operator: 'Sélectionnez un opérateur Mobile Money',
      duplicate: 'Vous êtes déjà abonné à ce plan ce mois-ci',
      connection: 'Erreur de connexion. Vérifiez votre réseau.',
      initError: "Erreur d'initialisation du paiement",
    },
  },
}

const en: Translations = {
  langName: 'English',
  flag: '🇬🇧',
  nav: {
    features: 'Features',
    pricing: 'Pricing',
    docs: 'Documentation',
    login: 'Login',
    start: 'Get Started',
  },
  hero: {
    badge: 'Next-generation AI for VS Code',
    title1: 'The AI that transforms',
    title2: 'the way you code',
    desc: 'Nexora integrates directly into VS Code to give you access to the most powerful AI models. Code faster, better, and with more confidence.',
    cta: 'Try for free',
    demo: 'Watch demo',
    stats: ['Claude & Gemini', 'DeepSeek V3', '10x faster', 'Secure code'],
  },
  features: {
    badge: 'Features',
    title: 'Everything you need',
    subtitle: 'Powerful tools to accelerate your daily development workflow',
    items: [
      { title: 'Integrated AI Chat', desc: 'Talk to AI directly inside VS Code to get real-time help and code suggestions.' },
      { title: 'Auto-completion', desc: 'Complete your code 10x faster with smart suggestions that understand context.' },
      { title: 'Code Generation', desc: 'Generate full functions, classes, and algorithms from natural language descriptions.' },
      { title: 'Multi-model', desc: 'Access Claude, Gemini, DeepSeek and many more models from a single tool.' },
      { title: 'Agent Mode', desc: 'Let AI execute complex tasks, navigate your codebase, and propose changes.' },
      { title: 'Security & Privacy', desc: 'Your data is encrypted and never used for training. Full control over your code.' },
    ],
  },
  statsSection: {
    poweredBy: 'Powered by the best AI models',
  },
  faq: {
    badge: 'FAQ',
    title: 'Frequently asked questions',
    subtitle: 'Everything you need to know before getting started',
    items: [
      {
        q: 'Do I need a separate subscription to the AI model APIs?',
        a: 'No. Your Nexora subscription includes access to the models (DeepSeek, Gemini, Claude depending on your plan) — no API key to provide, no separate bill from providers.',
      },
      {
        q: 'Is my code stored or used to train models?',
        a: 'No. Your data is encrypted in transit and never used to train a model, neither by Nexora nor by the connected AI providers.',
      },
      {
        q: 'Can I change plans or cancel anytime?',
        a: 'Yes, no commitment. A plan change applies immediately, and cancelling auto-renewal keeps your access until the end of the period you already paid for.',
      },
      {
        q: 'Does Nexora only work on VS Code?',
        a: 'No — Nexora is also available across the whole JetBrains suite (IntelliJ IDEA, PyCharm, WebStorm...) and as a CLI agent for scripts and CI/CD.',
      },
      {
        q: 'What happens if I exceed my monthly credit quota?',
        a: 'You get warned in the dashboard as you approach the limit. The quota resets every month, and you can upgrade anytime to get more.',
      },
    ],
  },
  comparison: {
    badge: 'Comparison',
    title: 'Why choose Nexora',
    subtitle: 'Comparison based on public offerings at the time of writing, subject to change.',
    feature: 'Feature',
    rows: [
      { label: 'Model choice (Claude, Gemini, DeepSeek...)', nexora: 'Yes', copilot: 'Limited', cursor: 'Limited' },
      { label: 'Works in your existing IDE (VS Code, JetBrains)', nexora: 'Yes', copilot: 'Yes', cursor: 'No (dedicated IDE)' },
      { label: 'Autonomous Agent mode', nexora: 'Yes', copilot: 'Partial', cursor: 'Yes' },
      { label: 'Command-line agent (CLI)', nexora: 'Yes', copilot: 'Limited', cursor: 'Yes' },
      { label: 'Free plan, no credit card', nexora: 'Yes', copilot: 'Yes', cursor: 'Limited' },
      { label: 'Full JetBrains support', nexora: 'Yes', copilot: 'Yes', cursor: 'No' },
    ],
  },
  pricing: {
    badge: 'Pricing',
    title: 'Plans for every need',
    subtitle: 'Start for free and upgrade when you are ready',
    popular: 'Popular',
    period: '/month',
    cta: {
      free: 'Get started',
      starter: 'Choose Starter',
      pro: 'Choose Pro',
      business: 'Choose Business',
      enterprise: 'Contact us',
    },
    models: {
      free: 'DeepSeek, Gemini Flash',
      starter: 'DeepSeek, Gemini Flash/Pro',
      pro: 'DeepSeek, Gemini, Claude Haiku & Sonnet',
      business: 'DeepSeek, Gemini, Claude Haiku/Sonnet/Opus',
      enterprise: 'All models',
    },
    planFeatures: {
      free: ['100K credits/month', '200 requests/day', 'DeepSeek, Gemini Flash'],
      starter: ['4M credits/mo', '500 requests/day', '+ Gemini Pro', 'Unlimited autocomplete'],
      pro: ['15M credits/mo', '2,000 requests/day', '+ Claude Haiku & Sonnet', 'Agent Mode', 'Priority support'],
      business: ['40M credits/mo', '5,000 requests/day', '+ Claude Opus', 'Team mode', 'Priority support'],
      enterprise: ['100M credits/mo', 'Unlimited requests', 'All models', 'SSO + 24/7 support'],
    },
  },
  cta: {
    title: 'Ready to transform your code?',
    subtitle: 'Join thousands of developers who code smarter with Nexora.',
    button: 'Start for free',
  },
  footer: {
    desc: 'The VS Code extension that transforms your code with artificial intelligence.',
    cols: [
      { title: 'Product', links: [
        { label: 'Features', href: '/#features' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Documentation', href: '/docs' },
        { label: 'Changelog', href: '/changelog' },
      ] },
      { title: 'Company', links: [
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
      ] },
      { title: 'Legal', links: [
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
      ] },
    ],
    rights: 'All rights reserved.',
  },
  checkout: {
    back: 'Back to pricing',
    planSelected: 'Selected plan',
    title: 'Secure payment',
    subtitle: 'Your data is protected by TLS encryption',
    country: 'Country',
    method: 'Payment method',
    card: 'Credit / Debit card',
    momo: 'Mobile Money',
    phone: 'Phone number',
    phonePlaceholder: 'Your number',
    cardName: 'Cardholder name',
    cardNumber: 'Card number',
    expiry: 'Expiration date',
    cvv: 'CVV / CVC',
    operator: 'Mobile Money operator',
    accepted: 'Accepted cards:',
    submit: 'Pay',
    submitFree: 'Activate for free',
    processing: 'Processing...',
    securePayment: 'Secure payment',
    tls: 'TLS Encryption',
    searchCountry: 'Search country...',
    noCountry: 'No country found',
    holder: 'Cardholder',
    exp: 'Exp.',
    digits: 'digits',
    valid: '✓ Valid',
    mobilePrompt: 'Confirm the payment on your phone',
    errors: {
      cardName: 'Please enter the cardholder name',
      cardNumber: 'Incomplete card number (16 digits required)',
      expiry: 'Invalid expiration date (MM/YY)',
      expiryMonth: 'Invalid expiration month',
      expired: 'Card is expired',
      cvv: 'Incomplete CVV (3 digits required)',
      phone: 'Phone number is required',
      phoneLength: 'Number must contain {length} digits',
      operator: 'Select a Mobile Money operator',
      duplicate: 'You are already subscribed to this plan this month',
      connection: 'Connection error. Check your network.',
      initError: 'Payment initialization error',
    },
  },
}

const es: Translations = {
  langName: 'Español',
  flag: '🇪🇸',
  nav: {
    features: 'Características',
    pricing: 'Precios',
    docs: 'Documentación',
    login: 'Iniciar sesión',
    start: 'Comenzar',
  },
  hero: {
    badge: 'IA de nueva generación para VS Code',
    title1: 'La IA que transforma',
    title2: 'tu forma de programar',
    desc: 'Nexora se integra directamente en VS Code para darte acceso a los modelos de IA más potentes. Programa más rápido, mejor y con más confianza.',
    cta: 'Probar gratis',
    demo: 'Ver demo',
    stats: ['Claude & Gemini', 'DeepSeek V3', '10x más rápido', 'Código seguro'],
  },
  features: {
    badge: 'Características',
    title: 'Todo lo que necesitas',
    subtitle: 'Herramientas potentes para acelerar tu desarrollo diario',
    items: [
      { title: 'Chat IA Integrado', desc: 'Habla con la IA directamente en VS Code para obtener ayuda y sugerencias en tiempo real.' },
      { title: 'Autocompletado', desc: 'Completa tu código 10x más rápido con sugerencias inteligentes que entienden el contexto.' },
      { title: 'Generación de Código', desc: 'Genera funciones, clases y algoritmos completos a partir de descripciones en lenguaje natural.' },
      { title: 'Multi-modelos', desc: 'Accede a Claude, Gemini, DeepSeek y muchos más modelos desde una sola herramienta.' },
      { title: 'Modo Agente', desc: 'Deja que la IA ejecute tareas complejas, navegue tu código y proponga modificaciones.' },
      { title: 'Seguridad & Privacidad', desc: 'Tus datos están cifrados y nunca se usan para entrenamiento. Control total sobre tu código.' },
    ],
  },
  statsSection: {
    poweredBy: 'Impulsado por los mejores modelos de IA',
  },
  faq: {
    badge: 'Preguntas frecuentes',
    title: 'Preguntas frecuentes',
    subtitle: 'Todo lo que necesitas saber antes de empezar',
    items: [
      {
        q: '¿Necesito una suscripción aparte a las APIs de los modelos de IA?',
        a: 'No. Tu suscripción a Nexora incluye acceso a los modelos (DeepSeek, Gemini, Claude según el plan) — sin clave API que proporcionar ni factura aparte de los proveedores.',
      },
      {
        q: '¿Se almacena mi código o se usa para entrenar modelos?',
        a: 'No. Tus datos se cifran en tránsito y nunca se usan para entrenar un modelo, ni por Nexora ni por los proveedores de IA conectados.',
      },
      {
        q: '¿Puedo cambiar de plan o cancelar en cualquier momento?',
        a: 'Sí, sin compromiso. Un cambio de plan se aplica de inmediato, y cancelar la renovación automática te deja el acceso hasta el final del período ya pagado.',
      },
      {
        q: '¿Nexora solo funciona en VS Code?',
        a: 'No — Nexora también está disponible en toda la suite JetBrains (IntelliJ IDEA, PyCharm, WebStorm...) y como agente de línea de comandos (CLI) para scripts y CI/CD.',
      },
      {
        q: '¿Qué pasa si supero mi cuota mensual de créditos?',
        a: 'Se te avisa en el panel al acercarte al límite. La cuota se reinicia cada mes, y puedes mejorar de plan en cualquier momento para obtener más.',
      },
    ],
  },
  comparison: {
    badge: 'Comparativa',
    title: 'Por qué elegir Nexora',
    subtitle: 'Comparación basada en las ofertas públicas al momento de redactar esto, sujeta a cambios.',
    feature: 'Función',
    rows: [
      { label: 'Elección de modelo (Claude, Gemini, DeepSeek...)', nexora: 'Sí', copilot: 'Limitado', cursor: 'Limitado' },
      { label: 'Funciona en tu IDE actual (VS Code, JetBrains)', nexora: 'Sí', copilot: 'Sí', cursor: 'No (IDE dedicado)' },
      { label: 'Modo Agente autónomo', nexora: 'Sí', copilot: 'Parcial', cursor: 'Sí' },
      { label: 'Agente en línea de comandos (CLI)', nexora: 'Sí', copilot: 'Limitado', cursor: 'Sí' },
      { label: 'Plan gratuito sin tarjeta', nexora: 'Sí', copilot: 'Sí', cursor: 'Limitado' },
      { label: 'Soporte JetBrains completo', nexora: 'Sí', copilot: 'Sí', cursor: 'No' },
    ],
  },
  pricing: {
    badge: 'Precios',
    title: 'Planes para cada necesidad',
    subtitle: 'Comienza gratis y actualiza cuando estés listo',
    popular: 'Popular',
    period: '/mes',
    cta: {
      free: 'Comenzar',
      starter: 'Elegir Starter',
      pro: 'Elegir Pro',
      business: 'Elegir Business',
      enterprise: 'Contactar',
    },
    models: {
      free: 'DeepSeek, Gemini Flash',
      starter: 'DeepSeek, Gemini Flash/Pro',
      pro: 'DeepSeek, Gemini, Claude Haiku & Sonnet',
      business: 'DeepSeek, Gemini, Claude Haiku/Sonnet/Opus',
      enterprise: 'Todos los modelos',
    },
    planFeatures: {
      free: ['100K créditos/mes', '200 solicitudes/día', 'DeepSeek, Gemini Flash'],
      starter: ['4M créditos/mes', '500 solicitudes/día', '+ Gemini Pro', 'Autocompletado ilimitado'],
      pro: ['15M créditos/mes', '2.000 solicitudes/día', '+ Claude Haiku & Sonnet', 'Modo Agente', 'Soporte prioritario'],
      business: ['40M créditos/mes', '5.000 solicitudes/día', '+ Claude Opus', 'Modo equipo', 'Soporte prioritario'],
      enterprise: ['100M créditos/mes', 'Solicitudes ilimitadas', 'Todos los modelos', 'SSO + Soporte 24/7'],
    },
  },
  cta: {
    title: '¿Listo para transformar tu código?',
    subtitle: 'Únete a miles de desarrolladores que programan de forma más inteligente con Nexora.',
    button: 'Comenzar gratis',
  },
  footer: {
    desc: 'La extensión de VS Code que transforma tu código con inteligencia artificial.',
    cols: [
      { title: 'Producto', links: [
        { label: 'Características', href: '/#features' },
        { label: 'Precios', href: '/pricing' },
        { label: 'Documentación', href: '/docs' },
        { label: 'Changelog', href: '/changelog' },
      ] },
      { title: 'Empresa', links: [
        { label: 'Acerca de', href: '/about' },
        { label: 'Contacto', href: '/contact' },
      ] },
      { title: 'Legal', links: [
        { label: 'Privacidad', href: '/privacy' },
        { label: 'Términos', href: '/terms' },
      ] },
    ],
    rights: 'Todos los derechos reservados.',
  },
  checkout: {
    back: 'Volver a precios',
    planSelected: 'Plan seleccionado',
    title: 'Pago seguro',
    subtitle: 'Tus datos están protegidos con cifrado TLS',
    country: 'País',
    method: 'Método de pago',
    card: 'Tarjeta bancaria',
    momo: 'Mobile Money',
    phone: 'Número de teléfono',
    phonePlaceholder: 'Tu número',
    cardName: 'Nombre del titular',
    cardNumber: 'Número de tarjeta',
    expiry: 'Fecha de expiración',
    cvv: 'CVV / CVC',
    operator: 'Operador Mobile Money',
    accepted: 'Tarjetas aceptadas:',
    submit: 'Pagar',
    submitFree: 'Activar gratis',
    processing: 'Procesando...',
    securePayment: 'Pago seguro',
    tls: 'Cifrado TLS',
    searchCountry: 'Buscar país...',
    noCountry: 'No se encontró país',
    holder: 'Titular',
    exp: 'Exp.',
    digits: 'dígitos',
    valid: '✓ Válido',
    mobilePrompt: 'Confirma el pago en tu teléfono',
    errors: {
      cardName: 'Por favor ingresa el nombre del titular',
      cardNumber: 'Número de tarjeta incompleto (16 dígitos requeridos)',
      expiry: 'Fecha de expiración inválida (MM/AA)',
      expiryMonth: 'Mes de expiración inválido',
      expired: 'Tarjeta vencida',
      cvv: 'CVV incompleto (3 dígitos requeridos)',
      phone: 'Número de teléfono requerido',
      phoneLength: 'El número debe contener {length} dígitos',
      operator: 'Selecciona un operador Mobile Money',
      duplicate: 'Ya estás suscrito a este plan este mes',
      connection: 'Error de conexión. Verifica tu red.',
      initError: 'Error al inicializar el pago',
    },
  },
}

const pt: Translations = {
  langName: 'Português',
  flag: '🇧🇷',
  nav: {
    features: 'Funcionalidades',
    pricing: 'Preços',
    docs: 'Documentação',
    login: 'Entrar',
    start: 'Começar',
  },
  hero: {
    badge: 'IA de nova geração para VS Code',
    title1: 'A IA que transforma',
    title2: 'a sua forma de programar',
    desc: 'Nexora integra-se diretamente no VS Code para lhe dar acesso aos modelos de IA mais poderosos. Programe mais rápido, melhor e com mais confiança.',
    cta: 'Experimentar grátis',
    demo: 'Ver demo',
    stats: ['Claude & Gemini', 'DeepSeek V3', '10x mais rápido', 'Código seguro'],
  },
  features: {
    badge: 'Funcionalidades',
    title: 'Tudo o que você precisa',
    subtitle: 'Ferramentas poderosas para acelerar o seu desenvolvimento diário',
    items: [
      { title: 'Chat IA Integrado', desc: 'Converse com a IA diretamente no VS Code para obter ajuda e sugestões em tempo real.' },
      { title: 'Auto-completar', desc: 'Complete seu código 10x mais rápido com sugestões inteligentes que entendem o contexto.' },
      { title: 'Geração de Código', desc: 'Gere funções, classes e algoritmos completos a partir de descrições em linguagem natural.' },
      { title: 'Multi-modelos', desc: 'Acesse Claude, Gemini, DeepSeek e muitos outros modelos de uma única ferramenta.' },
      { title: 'Modo Agente', desc: 'Deixe a IA executar tarefas complexas, navegar no seu código e propor modificações.' },
      { title: 'Segurança & Privacidade', desc: 'Seus dados são criptografados e nunca usados para treinamento. Controle total sobre seu código.' },
    ],
  },
  statsSection: {
    poweredBy: 'Desenvolvido pelos melhores modelos de IA',
  },
  faq: {
    badge: 'Perguntas frequentes',
    title: 'Perguntas frequentes',
    subtitle: 'Tudo o que você precisa saber antes de começar',
    items: [
      {
        q: 'Preciso de uma assinatura separada para as APIs dos modelos de IA?',
        a: 'Não. Sua assinatura Nexora inclui acesso aos modelos (DeepSeek, Gemini, Claude conforme o plano) — sem chave de API para fornecer, sem fatura separada dos provedores.',
      },
      {
        q: 'Meu código é armazenado ou usado para treinar modelos?',
        a: 'Não. Seus dados são criptografados em trânsito e nunca usados para treinar um modelo, nem pela Nexora nem pelos provedores de IA conectados.',
      },
      {
        q: 'Posso mudar de plano ou cancelar a qualquer momento?',
        a: 'Sim, sem compromisso. Uma mudança de plano é aplicada imediatamente, e cancelar a renovação automática mantém seu acesso até o fim do período já pago.',
      },
      {
        q: 'A Nexora funciona só no VS Code?',
        a: 'Não — a Nexora também está disponível em toda a suite JetBrains (IntelliJ IDEA, PyCharm, WebStorm...) e como agente de linha de comando (CLI) para scripts e CI/CD.',
      },
      {
        q: 'O que acontece se eu ultrapassar minha cota mensal de créditos?',
        a: 'Você é avisado no painel ao se aproximar do limite. A cota é reiniciada todo mês, e você pode fazer upgrade a qualquer momento para obter mais.',
      },
    ],
  },
  comparison: {
    badge: 'Comparativo',
    title: 'Por que escolher a Nexora',
    subtitle: 'Comparação baseada nas ofertas públicas no momento da redação, sujeita a mudanças.',
    feature: 'Recurso',
    rows: [
      { label: 'Escolha do modelo (Claude, Gemini, DeepSeek...)', nexora: 'Sim', copilot: 'Limitado', cursor: 'Limitado' },
      { label: 'Funciona no seu IDE atual (VS Code, JetBrains)', nexora: 'Sim', copilot: 'Sim', cursor: 'Não (IDE dedicado)' },
      { label: 'Modo Agente autônomo', nexora: 'Sim', copilot: 'Parcial', cursor: 'Sim' },
      { label: 'Agente de linha de comando (CLI)', nexora: 'Sim', copilot: 'Limitado', cursor: 'Sim' },
      { label: 'Plano gratuito sem cartão', nexora: 'Sim', copilot: 'Sim', cursor: 'Limitado' },
      { label: 'Suporte JetBrains completo', nexora: 'Sim', copilot: 'Sim', cursor: 'Não' },
    ],
  },
  pricing: {
    badge: 'Preços',
    title: 'Planos para todas as necessidades',
    subtitle: 'Comece gratuitamente e faça upgrade quando estiver pronto',
    popular: 'Popular',
    period: '/mês',
    cta: {
      free: 'Começar',
      starter: 'Escolher Starter',
      pro: 'Escolher Pro',
      business: 'Escolher Business',
      enterprise: 'Contactar',
    },
    models: {
      free: 'DeepSeek, Gemini Flash',
      starter: 'DeepSeek, Gemini Flash/Pro',
      pro: 'DeepSeek, Gemini, Claude Haiku & Sonnet',
      business: 'DeepSeek, Gemini, Claude Haiku/Sonnet/Opus',
      enterprise: 'Todos os modelos',
    },
    planFeatures: {
      free: ['100K créditos/mês', '200 requisições/dia', 'DeepSeek, Gemini Flash'],
      starter: ['4M créditos/mês', '500 requisições/dia', '+ Gemini Pro', 'Autocompletar ilimitado'],
      pro: ['15M créditos/mês', '2.000 requisições/dia', '+ Claude Haiku & Sonnet', 'Modo Agente', 'Suporte prioritário'],
      business: ['40M créditos/mês', '5.000 requisições/dia', '+ Claude Opus', 'Modo equipe', 'Suporte prioritário'],
      enterprise: ['100M créditos/mês', 'Requisições ilimitadas', 'Todos os modelos', 'SSO + Suporte 24/7'],
    },
  },
  cta: {
    title: 'Pronto para transformar o seu código?',
    subtitle: 'Junte-se a milhares de programadores que programam de forma mais inteligente com Nexora.',
    button: 'Começar gratuitamente',
  },
  footer: {
    desc: 'A extensão VS Code que transforma o seu código com inteligência artificial.',
    cols: [
      { title: 'Produto', links: [
        { label: 'Funcionalidades', href: '/#features' },
        { label: 'Preços', href: '/pricing' },
        { label: 'Documentação', href: '/docs' },
        { label: 'Changelog', href: '/changelog' },
      ] },
      { title: 'Empresa', links: [
        { label: 'Sobre', href: '/about' },
        { label: 'Contato', href: '/contact' },
      ] },
      { title: 'Legal', links: [
        { label: 'Privacidade', href: '/privacy' },
        { label: 'Termos', href: '/terms' },
      ] },
    ],
    rights: 'Todos os direitos reservados.',
  },
  checkout: {
    back: 'Voltar aos preços',
    planSelected: 'Plano selecionado',
    title: 'Pagamento seguro',
    subtitle: 'Os seus dados são protegidos por encriptação TLS',
    country: 'País',
    method: 'Método de pagamento',
    card: 'Cartão bancário',
    momo: 'Mobile Money',
    phone: 'Número de telemóvel',
    phonePlaceholder: 'O seu número',
    cardName: 'Nome do titular',
    cardNumber: 'Número do cartão',
    expiry: 'Data de validade',
    cvv: 'CVV / CVC',
    operator: 'Operador Mobile Money',
    accepted: 'Cartões aceites:',
    submit: 'Pagar',
    submitFree: 'Ativar gratuitamente',
    processing: 'A processar...',
    securePayment: 'Pagamento seguro',
    tls: 'Encriptação TLS',
    searchCountry: 'Pesquisar país...',
    noCountry: 'Nenhum país encontrado',
    holder: 'Titular',
    exp: 'Val.',
    digits: 'dígitos',
    valid: '✓ Válido',
    mobilePrompt: 'Confirme o pagamento no seu telemóvel',
    errors: {
      cardName: 'Por favor insira o nome do titular',
      cardNumber: 'Número de cartão incompleto (16 dígitos necessários)',
      expiry: 'Data de validade inválida (MM/AA)',
      expiryMonth: 'Mês de validade inválido',
      expired: 'Cartão expirado',
      cvv: 'CVV incompleto (3 dígitos necessários)',
      phone: 'Número de telemóvel obrigatório',
      phoneLength: 'O número deve ter {length} dígitos',
      operator: 'Selecione um operador Mobile Money',
      duplicate: 'Já está subscrito a este plano este mês',
      connection: 'Erro de ligação. Verifique a sua rede.',
      initError: 'Erro ao inicializar o pagamento',
    },
  },
}

export const translations: Record<Lang, Translations> = { fr, en, es, pt }
export const LANGS: Lang[] = ['fr', 'en', 'es', 'pt']
