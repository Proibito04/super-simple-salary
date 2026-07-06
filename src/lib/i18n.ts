import { writable, derived } from 'svelte/store';
import { format } from 'date-fns';

export type Lang = 'it' | 'en' | 'fr';

export const currentLang = writable<Lang>('it');

export function initLang() {
  if (typeof window !== 'undefined') {
    try {
      let saved: Lang | null = null;
      try {
        saved = localStorage.getItem('app_lang') as Lang;
      } catch (err) {
        console.warn("localStorage is not accessible:", err);
      }
      
      if (saved && ['it', 'en', 'fr'].includes(saved)) {
        currentLang.set(saved);
        return;
      }
      
      const rawLang = navigator.language || (navigator.languages && navigator.languages[0]) || 'en';
      const browserLang = rawLang.slice(0, 2);
      if (['en', 'fr', 'it'].includes(browserLang)) {
        currentLang.set(browserLang as Lang);
      } else {
        currentLang.set('en'); // Default to English
      }
    } catch (e) {
      console.error("Error initializing i18n:", e);
      currentLang.set('en'); // Fallback to English on error
    }
  }
}

export function changeLang(lang: Lang) {
  currentLang.set(lang);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('app_lang', lang);
    } catch (err) {
      console.warn("Could not save language to localStorage:", err);
    }
  }
}

export const translations = {
  it: {
    home: 'Home',
    stats: 'Statistiche',
    companies: 'Aziende',
    add: 'Aggiungi',
    salary: 'Stipendio',
    recentShifts: 'Turni di Lavoro Recenti',
    tipClickDate: 'Tip: clicca sulla data o sul pulsante "Modifica" per modificare il giorno, le aziende, le indennità e le fasce orarie.',
    hoursWorked: 'Ore lavorate',
    fixedRate: 'Tariffa fissa',
    payDetails: 'Dettaglio Paga',
    hours: 'Ore',
    dailyTotal: 'Totale Giorno',
    edit: 'Modifica',
    editDay: 'Modifica Giorno',
    deleteDay: 'Elimina Giorno',
    manageShifts: 'Gestisci Fasce',
    yes: 'Sì',
    no: 'No',
    flat: 'Prezzo Fisso',
    confirmDeleteDay: 'Sei sicuro di voler eliminare definitivamente questo giorno lavorato?',
    dayDeleted: 'Giorno lavorato eliminato! 🗑️',
    errorDelete: "Errore durante l'eliminazione",
    save: 'Salva',
    cancel: 'Annulla',
    close: 'Chiudi',
    day: 'Giorno',
    company: 'Azienda',
    noCompany: 'Nessuna azienda (Paga standard)',
    payMode: 'Modalità di Pagamento',
    hoursAllowance: 'Ore + Rimborsi',
    fixedAllowance: 'Prezzo Fisso (Flat)',
    allowances: 'Rimborsi / Indennità',
    noAllowances: 'Nessun rimborso configurato per questa azienda.',
    amount: 'Importo',
    fixedAmount: 'Importo Fisso (€)',
    extraEarnings: 'Entrate Extra (Mance, bonus, ecc...)',
    timeSlotsText: 'Fasce Orarie lavorate (per tracciare le ore):',
    start: 'Inizio',
    end: 'Fine',
    remove: 'Rimuovi',
    addTimeSlot: '+ Aggiungi fascia oraria',
    saveShift: 'Salva Turno',
    saveChanges: 'Salva Modifiche',
    shiftSaved: 'Turno salvato con successo! 🎉',
    shiftUpdated: 'Turno aggiornato con successo! 💾',
    errorSaving: 'Errore durante il salvataggio',
    enterValidTimeSlot: 'Inserisci almeno una fascia oraria completa (inizio e fine)!',
    welcomeTitle: 'Benvenuto nella nuova versione! 🥳',
    welcomeSubtitle: "Ecco le novità dell'applicazione:",
    welcomeItem1: '🎨 Nuovo look moderno (Tema verde coerente)',
    welcomeItem2: '🚗 Rimborsi ed indennità completamente dinamici ed editabili',
    welcomeItem3: '📋 Report dettagliati giorno per giorno (Generali e per singola Azienda)',
    welcomeItem4: '📱 Barra di navigazione in basso (Ottimizzata per smartphone)',
    welcomeItem5: '🔔 Notifiche in-app pulite ed eleganti',
    welcomeItem6: '🛠️ Gestione fasce orarie migliorata (Aggiungi/rimuovi in tempo reale)',
    gourmetSection: 'Sei di Gourmet in Villa?',
    gourmetDescription: "C'è questa predisposizione per te!",
    gourmetButton: 'Configura Gourmet in Villa 🎉',
    gourmetSuccess: 'Preset Gourmet in Villa importato! 🏰🎉',
    gourmetError: "Errore durante l'importazione",
    startWorking: 'Inizia a Lavorare 🚀',
    
    // Stats page translations
    monthSalary: 'Stipendio stimato',
    totalHours: 'Totale ore lavorate',
    totalDays: 'Totale giorni lavorati',
    totalTips: 'Totale entrate extra',
    earningsByCompany: 'Guadagni per Azienda',
    noStats: 'Nessun dato registrato per questo mese.',
    reportAggregated: 'Report Aggregato',
    copyReport: 'Copia Report',
    reportCopied: 'Report copiato negli appunti! 📋',
    reportDetails: 'Dettagli Report',
    singleCompanyReport: 'Report Azienda',
    shiftLog: 'Registro Turni',
    monthText: 'Mese',
    selectLanguage: 'Lingua',
    
    // Report text keys
    defaultCompany: 'Azienda Standard (Default)',
    standardPay: 'Generica / Paga Standard',
    daysWorked: 'Giorni lavorati',
    hourlyCompensation: 'Compenso orario',
    fixedCompensation: 'Compenso fisso',
    expenseReimbursements: 'Rimborsi spese',
    tips: 'Entrate extra/Mance',
    companyTotal: 'TOTALE AZIENDA',
    generalMonthlyTotal: 'TOTALE MENSILE GENERALE',
    totalMonthlyHours: 'Ore totali mensili',
    compensationSummary: 'RIEPILOGO COMPENSI',
    aggregatedReportText: 'Report generale mensile copiato!',
    companyReportText: 'Report copiato!',
    flatRateDetails: 'Fisso',
    allowancesDetails: 'Rimborsi',
    totalText: 'Totale',
    addShiftsPrompt: 'Aggiungi turni dalla Home per visualizzare le statistiche.',
    
    // Companies page translations
    companySettings: 'Gestione Aziende',
    addCompany: 'Aggiungi Nuova Azienda',
    editCompany: 'Modifica Azienda',
    companyNameLabel: 'Nome Azienda',
    hourlyWageLabel: 'Paga Oraria (€/h)',
    customAllowancesLabel: 'Configura Rimborsi e Indennità Personalizzate',
    allowanceNamePlaceholder: 'Es: Macchina, Rimborso Pasto',
    allowanceAmountPlaceholder: 'Importo',
    addAllowanceButton: '+ Aggiungi Rimborso',
    saveCompany: 'Salva Azienda',
    confirmDeleteCompany: 'Sei sicuro di voler eliminare questa azienda?',
    companySavedSuccess: 'Azienda salvata! 🏢',
    companyDeletedSuccess: 'Azienda eliminata! 🗑️',
    noCompaniesYet: 'Nessuna azienda creata. Aggiungine una sopra o usa il preset Gourmet in Villa!',
    
    // Months helper translation
    gennaio: 'Gennaio', febbraio: 'Febbraio', marzo: 'Marzo', aprile: 'Aprile', maggio: 'Maggio', giugno: 'Giugno',
    luglio: 'Luglio', agosto: 'Agosto', settembre: 'Settembre', ottobre: 'Ottobre', novembre: 'Novembre', dicembre: 'Dicembre'
  },
  en: {
    home: 'Home',
    stats: 'Stats',
    companies: 'Companies',
    add: 'Add',
    salary: 'Salary',
    recentShifts: 'Recent Work Shifts',
    tipClickDate: 'Tip: click on the date or the "Edit" button to modify the day, companies, allowances, and time slots.',
    hoursWorked: 'Hours worked',
    fixedRate: 'Fixed rate',
    payDetails: 'Pay Details',
    hours: 'Hours',
    dailyTotal: 'Daily Total',
    edit: 'Edit',
    editDay: 'Edit Day',
    deleteDay: 'Delete Day',
    manageShifts: 'Manage shifts',
    yes: 'Yes',
    no: 'No',
    flat: 'Fixed Price',
    confirmDeleteDay: 'Are you sure you want to permanently delete this worked day?',
    dayDeleted: 'Worked day deleted! 🗑️',
    errorDelete: 'Error deleting',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    day: 'Day',
    company: 'Company',
    noCompany: 'No company (Standard pay)',
    payMode: 'Payment Mode',
    hoursAllowance: 'Hours + Allowances',
    fixedAllowance: 'Fixed Price (Flat)',
    allowances: 'Allowances / Reimbursements',
    noAllowances: 'No allowances configured for this company.',
    amount: 'Amount',
    fixedAmount: 'Fixed Amount (€)',
    extraEarnings: 'Extra Earnings (Tips, bonuses, etc...)',
    timeSlotsText: 'Worked time slots (to track hours):',
    start: 'Start',
    end: 'End',
    remove: 'Remove',
    addTimeSlot: '+ Add time slot',
    saveShift: 'Save Shift',
    saveChanges: 'Save Changes',
    shiftSaved: 'Shift saved successfully! 🎉',
    shiftUpdated: 'Shift updated successfully! 💾',
    errorSaving: 'Error saving',
    enterValidTimeSlot: 'Please enter at least one complete time slot (start and end)!',
    welcomeTitle: 'Welcome to the new version! 🥳',
    welcomeSubtitle: 'Here are the updates to the application:',
    welcomeItem1: '🎨 New modern look (Consistent green theme)',
    welcomeItem2: '🚗 Fully dynamic and editable allowances/refunds',
    welcomeItem3: '📋 Detailed day-by-day reports (General and per Company)',
    welcomeItem4: '📱 Bottom navigation bar (Optimized for smartphones)',
    welcomeItem5: '🔔 Clean and elegant in-app notifications',
    welcomeItem6: '🛠️ Improved time slot management (Add/remove in real-time)',
    gourmetSection: 'Are you from Gourmet in Villa?',
    gourmetDescription: 'There is a preset ready for you!',
    gourmetButton: 'Configure Gourmet in Villa 🎉',
    gourmetSuccess: 'Gourmet in Villa preset imported! 🏰🎉',
    gourmetError: 'Error importing',
    startWorking: 'Start Working 🚀',
    
    // Stats page translations
    monthSalary: 'Estimated salary',
    totalHours: 'Total hours worked',
    totalDays: 'Total days worked',
    totalTips: 'Total extra earnings',
    earningsByCompany: 'Earnings by Company',
    noStats: 'No data recorded for this month.',
    reportAggregated: 'Aggregated Report',
    copyReport: 'Copy Report',
    reportCopied: 'Report copied to clipboard! 📋',
    reportDetails: 'Report Details',
    singleCompanyReport: 'Company Report',
    shiftLog: 'Shift Log',
    monthText: 'Month',
    selectLanguage: 'Language',
    
    // Report text keys
    defaultCompany: 'Standard Company (Default)',
    standardPay: 'Generic / Standard Pay',
    daysWorked: 'Days worked',
    hourlyCompensation: 'Hourly compensation',
    fixedCompensation: 'Fixed compensation',
    expenseReimbursements: 'Expense reimbursements',
    tips: 'Extra earnings/Tips',
    companyTotal: 'COMPANY TOTAL',
    generalMonthlyTotal: 'GENERAL MONTHLY TOTAL',
    totalMonthlyHours: 'Total monthly hours',
    compensationSummary: 'COMPENSATION SUMMARY',
    aggregatedReportText: 'General monthly report copied!',
    companyReportText: 'Report copied!',
    flatRateDetails: 'Flat',
    allowancesDetails: 'Reimbursements',
    totalText: 'Total',
    addShiftsPrompt: 'Add shifts from Home to view statistics.',
    
    // Companies page translations
    companySettings: 'Manage Companies',
    addCompany: 'Add New Company',
    editCompany: 'Edit Company',
    companyNameLabel: 'Company Name',
    hourlyWageLabel: 'Hourly Wage (€/h)',
    customAllowancesLabel: 'Configure Custom Allowances and Reimbursements',
    allowanceNamePlaceholder: 'e.g. Car, Meal Allowance',
    allowanceAmountPlaceholder: 'Amount',
    addAllowanceButton: '+ Add Allowance',
    saveCompany: 'Save Company',
    confirmDeleteCompany: 'Are you sure you want to delete this company?',
    companySavedSuccess: 'Company saved! 🏢',
    companyDeletedSuccess: 'Company deleted! 🗑️',
    noCompaniesYet: 'No companies created. Add one above or use the Gourmet in Villa preset!',
    
    // Months helper translation
    gennaio: 'January', febbraio: 'February', marzo: 'March', aprile: 'April', maggio: 'May', giugno: 'June',
    luglio: 'July', agosto: 'August', settembre: 'September', ottobre: 'October', novembre: 'November', dicembre: 'December'
  },
  fr: {
    home: 'Accueil',
    stats: 'Statistiques',
    companies: 'Entreprises',
    add: 'Ajouter',
    salary: 'Salaire',
    recentShifts: 'Quarts de travail récents',
    tipClickDate: 'Astuce: cliquez sur la date ou le bouton "Modifier" pour modifier le jour, les entreprises, les indemnités et les tranches horaires.',
    hoursWorked: 'Heures travaillées',
    fixedRate: 'Tarif fixe',
    payDetails: 'Détails de la paye',
    hours: 'Heures',
    dailyTotal: 'Total du jour',
    edit: 'Modifier',
    editDay: 'Modifier le jour',
    deleteDay: 'Supprimer le jour',
    manageShifts: 'Gérer les tranches',
    yes: 'Oui',
    no: 'Non',
    flat: 'Prix Fixe',
    confirmDeleteDay: 'Êtes-vous sûr de vouloir supprimer définitivement ce jour de travail ?',
    dayDeleted: 'Journée de travail supprimée ! 🗑️',
    errorDelete: 'Erreur lors de la suppression',
    save: 'Sauvegarder',
    cancel: 'Annuler',
    close: 'Fermer',
    day: 'Jour',
    company: 'Entreprise',
    noCompany: 'Aucune entreprise (Paye standard)',
    payMode: 'Mode de paiement',
    hoursAllowance: 'Heures + Indemnités',
    fixedAllowance: 'Prix Fixe (Flat)',
    allowances: 'Indemnités / Remboursements',
    noAllowances: 'Aucune indemnité configurée pour cette entreprise.',
    amount: 'Montant',
    fixedAmount: 'Montant Fixe (€)',
    extraEarnings: 'Gains supplémentaires (Pourboires, bonus, etc...)',
    timeSlotsText: 'Tranches horaires travaillées (pour le suivi) :',
    start: 'Début',
    end: 'Fin',
    remove: 'Retirer',
    addTimeSlot: '+ Ajouter une tranche horaire',
    saveShift: 'Enregistrer le quart',
    saveChanges: 'Sauvegarder les modifications',
    shiftSaved: 'Quart enregistré avec succès ! 🎉',
    shiftUpdated: 'Quart mis à jour avec succès ! 💾',
    errorSaving: "Erreur lors de l'enregistrement",
    enterValidTimeSlot: 'Veuillez saisir au moins une tranche horaire complète (début et fin) !',
    welcomeTitle: 'Bienvenue dans la nouvelle version ! 🥳',
    welcomeSubtitle: "Voici les nouveautés de l'application :",
    welcomeItem1: '🎨 Nouveau look moderne (Thème vert cohérent)',
    welcomeItem2: '🚗 Indemnités/remboursements entièrement dynamiques et modifiables',
    welcomeItem3: '📋 Rapports détaillés jour par jour (Généraux et par Entreprise)',
    welcomeItem4: '📱 Barre de navigation en bas (Optimisée pour smartphones)',
    welcomeItem5: '🔔 Notifications in-app propres et élégantes',
    welcomeItem6: '🛠️ Gestion améliorée des tranches (Ajouter/retirer en temps réel)',
    gourmetSection: 'Êtes-vous de Gourmet in Villa ?',
    gourmetDescription: 'Il y a un préréglage prêt pour vous !',
    gourmetButton: 'Configurer Gourmet in Villa 🎉',
    gourmetSuccess: 'Préréglage Gourmet in Villa importé ! 🏰🎉',
    gourmetError: "Erreur lors de l'importation",
    startWorking: 'Commencer à travailler 🚀',
    
    // Stats page translations
    monthSalary: 'Salaire estimé',
    totalHours: 'Heures totales travaillées',
    totalDays: 'Jours totaux travaillés',
    totalTips: 'Total gains supplémentaires',
    earningsByCompany: 'Gains par Entreprise',
    noStats: 'Aucune donnée enregistrée pour ce mois.',
    reportAggregated: 'Rapport Agrégé',
    copyReport: 'Copier le Rapport',
    reportCopied: 'Rapport copié dans le presse-papiers ! 📋',
    reportDetails: 'Détails du Rapport',
    singleCompanyReport: 'Rapport Entreprise',
    shiftLog: 'Registre des Quarts',
    monthText: 'Mois',
    selectLanguage: 'Langue',
    
    // Report text keys
    defaultCompany: 'Entreprise Standard (Défaut)',
    standardPay: 'Générique / Paye Standard',
    daysWorked: 'Jours travaillés',
    hourlyCompensation: 'Indemnité horaire',
    fixedCompensation: 'Compenso fisso',
    expenseReimbursements: 'Remboursements de frais',
    tips: 'Gains supplémentaires/Pourboires',
    companyTotal: 'TOTAL DE L\'ENTREPRISE',
    generalMonthlyTotal: 'TOTAL MENSUEL GÉNÉRAL',
    totalMonthlyHours: 'Heures mensuelles totales',
    compensationSummary: 'RÉSUMÉ DES RÉTRIBUTIONS',
    aggregatedReportText: 'Rapport mensuel général copié !',
    companyReportText: 'Rapport copié !',
    flatRateDetails: 'Tarif Fixe',
    allowancesDetails: 'Remboursements',
    totalText: 'Total',
    addShiftsPrompt: 'Ajoutez des quarts depuis l\'accueil pour voir les statistiques.',
    
    // Companies page translations
    companySettings: 'Gérer les Entreprises',
    addCompany: 'Ajouter une Nouvelle Entreprise',
    editCompany: 'Modifier l\'Entreprise',
    companyNameLabel: 'Nom de l\'Entreprise',
    hourlyWageLabel: 'Taux Horaire (€/h)',
    customAllowancesLabel: 'Configurer les Indemnités et Remboursements Personnalisés',
    allowanceNamePlaceholder: 'Ex: Voiture, Indemnité de Repas',
    allowanceAmountPlaceholder: 'Montant',
    addAllowanceButton: '+ Ajouter une Indemnité',
    saveCompany: 'Sauvegarder l\'Entreprise',
    confirmDeleteCompany: 'Êtes-vous sûr de vouloir supprimer cette entreprise ?',
    companySavedSuccess: 'Entreprise sauvegardée ! 🏢',
    companyDeletedSuccess: 'Entreprise supprimée ! 🗑️',
    noCompaniesYet: 'Aucune entreprise créée. Ajoutez-en une ci-dessus ou utilisez le préréglage Gourmet in Villa !',
    
    // Months helper translation
    gennaio: 'Janvier', febbraio: 'Février', marzo: 'Mars', aprile: 'Avril', maggio: 'Mai', giugno: 'Juin',
    luglio: 'Juillet', agosto: 'Août', septembre: 'Septembre', ottobre: 'Octobre', novembre: 'Novembre', décembre: 'Décembre'
  }
};

export const t = derived(currentLang, ($lang) => (key: keyof typeof translations['en'] | string) => {
  const dict = translations[$lang] || translations['en'];
  return (dict as any)[key] || key;
});

// Helper for months translation
export function getTranslatedMonth(date: Date, lang: Lang): string {
  const monthName = format(date, 'MMMM').toLowerCase();
  const dict = translations[lang] || translations['en'];
  return (dict as any)[monthName] || format(date, 'MMMM');
}
