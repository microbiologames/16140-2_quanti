/**
 * Libellés des résultats, en français et en anglais.
 *
 * Un dictionnaire écrit à la main, pas une traduction automatique : le vocabulaire est
 * fermé, technique et normatif — « UFC » et non « CFU », « justesse relative » et non
 * « exactitude ». Aucun service externe, aucune clé d'API, rien à payer, et la
 * traduction est instantanée et disponible hors ligne.
 *
 * Ce qui vient du fichier d'entrée — noms de catégories, de types et de produits —
 * n'est pas traduit : ce sont les données de l'utilisateur, les toucher serait les
 * altérer.
 */

export type Locale = 'fr' | 'en'

/** L'anglais par défaut : c'est la langue des classeurs produits jusqu'ici. */
export const DEFAULT_LOCALE: Locale = 'en'

export const LOCALES: { id: Locale; label: string }[] = [
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'English' },
]

export interface OutputStrings {
  /** Intitulés lisibles des six tableaux. */
  tableTitles: {
    counts: string
    countsByCase: string
    excluded: string
    statistics: string
    outliers: string
    outlierSummary: string
  }
  columns: {
    category: string
    type: string
    tested: string
    interpretable: string
    noResult: string
    lowCount: string
    outOfRange: string
    sampleNumber: string
    product: string
    referenceWithUnit: string
    alternativeWithUnit: string
    reference: string
    alternative: string
    n: string
    meanDifference: string
    standardDeviation: string
    lowerLimit: string
    upperLimit: string
    dataClassification: string
    beforeCorrection: string
    mean: string
    difference: string
    sampleCount: string
    case: string
  }
  /** Les quatre cas de classement, dans l'ordre 1 à 4. */
  cases: [string, string, string, string]
  rows: {
    total: string
    allCategories: string
    belowLower: string
    aboveUpper: string
    totalBelow: string
    totalAbove: string
    grandTotal: string
  }
  figures: {
    scatterX: string
    scatterY: string
    agreementX: string
    agreementY: string
    allCategories: string
    agreementTitle: (category: string) => string
    lowCountSeries: string
    correctedSeries: string
    identityDiagonal: string
    identityZero: string
    bias: string
    lowerLimit: string
    upperLimit: string
  }
  /** Feuille de données brutes adossée aux formules du classeur. */
  dataSheet: {
    name: string
    columns: string[]
  }
}

const EN: OutputStrings = {
  tableTitles: {
    counts: 'Tested and interpretable samples',
    countsByCase: 'Sample counts by case',
    excluded: 'Samples excluded from the calculations',
    statistics: 'Bias and limits of agreement',
    outliers: 'Samples outside the limits',
    outlierSummary: 'Distribution of samples outside the limits',
  },
  columns: {
    category: 'Category',
    type: 'Type',
    tested: 'Number of tested samples',
    interpretable: 'Number of samples with interpretable results by both methods',
    noResult: 'Number of samples with no results (ND)',
    lowCount: 'Number of samples with less than 4 colonies/plate',
    outOfRange: 'Number of samples below or above the quantification limit',
    sampleNumber: 'Sample n°',
    product: 'Product',
    referenceWithUnit: 'Reference method (log CFU/g)',
    alternativeWithUnit: 'Alternative method (log CFU/g)',
    reference: 'Reference method',
    alternative: 'Alternative method',
    n: 'n',
    meanDifference: 'Average difference',
    standardDeviation: 'Standard deviation of differences',
    lowerLimit: '95% lower limit',
    upperLimit: '95% upper limit',
    dataClassification: 'Classification of the data',
    beforeCorrection: 'Values before correction (Reference or/and alternative method)',
    mean: 'Mean',
    difference: 'Difference',
    sampleCount: 'Number of samples',
    case: 'Case',
  },
  cases: [
    'Interpretable results by both methods',
    '<4 CFU/plate',
    '< or > quantification limits',
    'No result',
  ],
  rows: {
    total: 'Total',
    allCategories: 'All categories',
    belowLower: '<LCL',
    aboveUpper: '>UCL',
    totalBelow: 'Total <LCL',
    totalAbove: 'Total >UCL',
    grandTotal: 'TOTAL',
  },
  figures: {
    scatterX: 'Reference method (log CFU/g)',
    scatterY: 'Alternative method (log CFU/g)',
    agreementX: 'Mean (log CFU/g)',
    agreementY: 'Difference alternative − reference (log CFU/g)',
    allCategories: 'All categories',
    agreementTitle: (category) => `Bland-Altman — ${category}`,
    lowCountSeries: '<4 colonies/plate',
    correctedSeries: 'corrected values',
    identityDiagonal: 'y = x',
    identityZero: 'y = 0',
    bias: 'Bias',
    lowerLimit: '95 % lower limit',
    upperLimit: '95 % upper limit',
  },
  dataSheet: {
    name: 'Data',
    columns: [
      'Sample n°',
      'Category',
      'Type',
      'Case',
      'Reference method',
      'Alternative method',
      'Mean',
      'Difference',
    ],
  },
}

const FR: OutputStrings = {
  tableTitles: {
    counts: 'Échantillons testés et interprétables',
    countsByCase: 'Effectifs par cas',
    excluded: 'Échantillons écartés des calculs',
    statistics: 'Biais et limites de concordance',
    outliers: 'Échantillons hors limites',
    outlierSummary: 'Répartition des échantillons hors limites',
  },
  columns: {
    category: 'Catégorie',
    type: 'Type',
    tested: 'Nombre d’échantillons testés',
    interpretable: 'Nombre d’échantillons interprétables par les deux méthodes',
    noResult: 'Nombre d’échantillons sans résultat (ND)',
    lowCount: 'Nombre d’échantillons à moins de 4 colonies par boîte',
    outOfRange: 'Nombre d’échantillons hors limites de quantification',
    sampleNumber: 'N° d’échantillon',
    product: 'Produit',
    referenceWithUnit: 'Méthode de référence (log UFC/g)',
    alternativeWithUnit: 'Méthode alternative (log UFC/g)',
    reference: 'Méthode de référence',
    alternative: 'Méthode alternative',
    n: 'n',
    meanDifference: 'Différence moyenne',
    standardDeviation: 'Écart-type des différences',
    lowerLimit: 'Limite inférieure à 95 %',
    upperLimit: 'Limite supérieure à 95 %',
    dataClassification: 'Classement de la donnée',
    beforeCorrection: 'Valeurs avant correction (méthode de référence et/ou alternative)',
    mean: 'Moyenne',
    difference: 'Différence',
    sampleCount: 'Nombre d’échantillons',
    case: 'Cas',
  },
  cases: [
    'Résultats interprétables par les deux méthodes',
    '< 4 UFC par boîte',
    'Hors limites de quantification',
    'Sans résultat',
  ],
  rows: {
    total: 'Total',
    allCategories: 'Toutes catégories',
    belowLower: '< limite inf.',
    aboveUpper: '> limite sup.',
    totalBelow: 'Total < limite inf.',
    totalAbove: 'Total > limite sup.',
    grandTotal: 'TOTAL',
  },
  figures: {
    scatterX: 'Méthode de référence (log UFC/g)',
    scatterY: 'Méthode alternative (log UFC/g)',
    agreementX: 'Moyenne (log UFC/g)',
    agreementY: 'Différence alternative − référence (log UFC/g)',
    allCategories: 'Toutes catégories',
    agreementTitle: (category) => `Bland-Altman — ${category}`,
    lowCountSeries: '< 4 colonies par boîte',
    correctedSeries: 'valeurs corrigées',
    identityDiagonal: 'y = x',
    identityZero: 'y = 0',
    bias: 'Biais',
    lowerLimit: 'Limite inférieure à 95 %',
    upperLimit: 'Limite supérieure à 95 %',
  },
  dataSheet: {
    name: 'Données',
    columns: [
      'N° d’échantillon',
      'Catégorie',
      'Type',
      'Cas',
      'Méthode de référence',
      'Méthode alternative',
      'Moyenne',
      'Différence',
    ],
  },
}

const STRINGS: Record<Locale, OutputStrings> = { fr: FR, en: EN }

export function strings(locale: Locale = DEFAULT_LOCALE): OutputStrings {
  return STRINGS[locale]
}
