<script lang="ts">
  import { DB } from '$lib/database'
  import { toasts } from '$lib/toast'
  import { format, getMonth, getYear, subMonths, addMonths } from 'date-fns'
  import {
    calculateTotalHours,
    calculateDailyEarnings
  } from '$lib/utils/timeTrackingUtils'
  import { t, currentLang, getTranslatedMonth } from '$lib/i18n'
  import type { WorkedDay } from '../../types'

  let workedDays = $state<WorkedDay[]>([])

  DB._workedDays.subscribe((val) => {
    workedDays = val || []
  })

  let currentSelection = $state(new Date())
  let currentDaysDisplayed = $derived(
    workedDays.filter(
      (all) =>
        getMonth(all.date) === getMonth(currentSelection) &&
        getYear(all.date) === getYear(currentSelection)
    )
  )

  type CompanyStats = {
    companyId: string;
    companyName: string;
    totalHours: number;
    hourlyEarnings: number;
    fixedEarnings: number;
    reimbursements: number;
    extraEarnings: number;
    totalEarnings: number;
    daysCount: number;
    days: WorkedDay[];
  };

  let statsByCompany = $derived.by(() => {
    const map = new Map<string, CompanyStats>();
    
    currentDaysDisplayed.forEach(day => {
      const cid = day.companyId || 'default';
      const cname = day.companyName || (cid === 'default' ? $t('defaultCompany') : $t('standardPay'));
      
      if (!map.has(cid)) {
        map.set(cid, {
          companyId: cid,
          companyName: cname,
          totalHours: 0,
          hourlyEarnings: 0,
          fixedEarnings: 0,
          reimbursements: 0,
          extraEarnings: 0,
          totalEarnings: 0,
          daysCount: 0,
          days: []
        });
      }
      
      const stats = map.get(cid)!;
      stats.daysCount += 1;
      stats.days.push(day);
      
      const hours = calculateTotalHours(day.timeSlots);
      stats.totalHours += hours;
      
      let dayHourly = 0;
      let dayFixed = 0;
      if (day.payMode === 'fixed') {
        dayFixed = Number(day.fixedPrice) || 0;
      } else {
        const wage = Number(day.hourlyWage) || 10;
        dayHourly = hours * wage;
      }
      stats.hourlyEarnings += dayHourly;
      stats.fixedEarnings += dayFixed;
      
      let dayReimb = 0;
      if (day.customSettings && day.customSettings.length > 0) {
        day.customSettings.forEach(s => {
          if (s.active) dayReimb += Number(s.amount) || 0;
        });
      }
      stats.reimbursements += dayReimb;
      
      const dayExtra = Number(day.extraEarnings) || 0;
      stats.extraEarnings += dayExtra;
      
      stats.totalEarnings += (dayHourly + dayFixed + dayReimb + dayExtra);
    });
    
    const result = Array.from(map.values());
    result.forEach(r => {
      r.days.sort((a, b) => a.date.getTime() - b.date.getTime());
    });
    return result;
  });

  let grandTotals = $derived.by(() => {
    return statsByCompany.reduce((acc, s) => {
      acc.hours += s.totalHours;
      acc.earnings += s.totalEarnings;
      acc.reimbursements += s.reimbursements;
      acc.extra += s.extraEarnings;
      acc.days += s.daysCount;
      return acc;
    }, { hours: 0, earnings: 0, reimbursements: 0, extra: 0, days: 0 });
  });

  function formatDaySummary(day: WorkedDay): string {
    const dateStr = format(day.date, 'dd/MM/yyyy');
    let details = '';
    if (day.payMode === 'fixed') {
      details += `${$t('flatRateDetails')} €${day.fixedPrice}`;
    } else {
      const hours = calculateTotalHours(day.timeSlots);
      details += `${hours.toFixed(1)}h @ €${day.hourlyWage}/h`;
    }

    let dayReimb = 0;
    let activeReimbNames: string[] = [];
    if (day.customSettings && day.customSettings.length > 0) {
      day.customSettings.forEach(s => {
        if (s.active) {
          dayReimb += Number(s.amount) || 0;
          activeReimbNames.push(`${s.name} €${s.amount}`);
        }
      });
    }
    
    if (dayReimb > 0) {
      details += ` + ${$t('allowancesDetails')} €${dayReimb} (${activeReimbNames.join(', ')})`;
    }

    if (day.extraEarnings && Number(day.extraEarnings) > 0) {
      details += ` + Extra €${day.extraEarnings}`;
    }
    
    const dailyTotal = calculateDailyEarnings(day);
    return `• ${dateStr}: ${details} ➔ ${$t('totalText')}: €${dailyTotal.toFixed(2)}`;
  }

  let reportText = $derived.by(() => {
    let report = `📋 ${$t('compensationSummary').toUpperCase()} - ${getTranslatedMonth(currentSelection, $currentLang).toUpperCase()} ${getYear(currentSelection)}\n`;
    report += `=====================================\n\n`;
    
    statsByCompany.forEach(stats => {
      report += `🏢 ${stats.companyName.toUpperCase()}\n`;
      report += `-------------------------------------\n`;
      stats.days.forEach(day => {
        report += `${formatDaySummary(day)}\n`;
      });
      report += `-------------------------------------\n`;
      report += `• ${$t('daysWorked')}: ${stats.daysCount}\n`;
      if (stats.totalHours > 0) {
        report += `• ${$t('totalHours')}: ${stats.totalHours.toFixed(1)} ${$t('hours').toLowerCase()}\n`;
      }
      if (stats.hourlyEarnings > 0) {
        report += `• ${$t('hourlyCompensation')}: € ${stats.hourlyEarnings.toFixed(2)}\n`;
      }
      if (stats.fixedEarnings > 0) {
        report += `• ${$t('fixedCompensation')}: € ${stats.fixedEarnings.toFixed(2)}\n`;
      }
      if (stats.reimbursements > 0) {
        report += `• ${$t('expenseReimbursements')}: € ${stats.reimbursements.toFixed(2)}\n`;
      }
      if (stats.extraEarnings > 0) {
        report += `• ${$t('tips')}: € ${stats.extraEarnings.toFixed(2)}\n`;
      }
      report += `👉 ${$t('companyTotal')}: € ${stats.totalEarnings.toFixed(2)}\n`;
      report += `=====================================\n\n`;
    });
    
    report += `💰 ${$t('generalMonthlyTotal')}: € ${grandTotals.earnings.toFixed(2)}\n`;
    report += `⏱️ ${$t('totalMonthlyHours')}: ${grandTotals.hours.toFixed(1)} ${$t('hours').toLowerCase()}\n`;
    report += `=====================================`;
    return report;
  });

  function copyDetailedReport() {
    navigator.clipboard.writeText(reportText)
      .then(() => toasts.show($t('aggregatedReportText'), "success"))
      .catch(err => console.error("Error copying report:", err));
  }

  function copySingleCompanyReport(stats: CompanyStats) {
    let report = `🏢 ${$t('compensationSummary').toUpperCase()} - ${stats.companyName.toUpperCase()}\n`;
    report += `📅 ${$t('monthText').toUpperCase()}: ${getTranslatedMonth(currentSelection, $currentLang).toUpperCase()} ${getYear(currentSelection)}\n`;
    report += `=====================================\n`;
    stats.days.forEach(day => {
      report += `${formatDaySummary(day)}\n`;
    });
    report += `-------------------------------------\n`;
    report += `• ${$t('daysWorked')}: ${stats.daysCount}\n`;
    if (stats.totalHours > 0) {
      report += `• ${$t('totalHours')}: ${stats.totalHours.toFixed(1)} ${$t('hours').toLowerCase()}\n`;
    }
    if (stats.hourlyEarnings > 0) {
      report += `• ${$t('hourlyCompensation')}: € ${stats.hourlyEarnings.toFixed(2)}\n`;
    }
    if (stats.fixedEarnings > 0) {
      report += `• ${$t('fixedCompensation')}: € ${stats.fixedEarnings.toFixed(2)}\n`;
    }
    if (stats.reimbursements > 0) {
      report += `• ${$t('expenseReimbursements')}: € ${stats.reimbursements.toFixed(2)}\n`;
    }
    if (stats.extraEarnings > 0) {
      report += `• ${$t('tips')}: € ${stats.extraEarnings.toFixed(2)}\n`;
    }
    report += `👉 ${$t('companyTotal')}: € ${stats.totalEarnings.toFixed(2)}\n`;
    report += `=====================================`;

    navigator.clipboard.writeText(report)
      .then(() => toasts.show($t('companyReportText'), "success"))
      .catch(err => console.error("Error copying company report:", err));
  }
</script>

<div class="m-auto my-5 p-4 lg:w-4/5 xl:w-2/3 font-sans">
  <!-- Month Navigation -->
  <div class="flex items-center justify-between border-b pb-4 mb-6 dark:border-slate-800">
    <h1 class="text-2xl font-black text-gray-900 dark:text-white">{$t('stats')}</h1>
    <div class="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-lg">
      <button
        class="bold cursor-pointer font-bold px-3 py-1.5 rounded bg-white hover:bg-gray-50 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-650 transition shadow-sm"
        onclick={() => {
          currentSelection = subMonths(currentSelection, 1)
        }}>&lt;</button
      >
      <span class="px-3 text-sm font-bold text-gray-700 dark:text-gray-200 min-w-[150px] text-center capitalize font-mono"
        >{getTranslatedMonth(currentSelection, $currentLang)} {getYear(currentSelection)}</span
      >
      <button
        class="bold cursor-pointer font-bold px-3 py-1.5 rounded bg-white hover:bg-gray-50 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-650 transition shadow-sm"
        onclick={() => {
          currentSelection = addMonths(currentSelection, 1)
        }}>&gt;</button
      >
    </div>
  </div>

  {#if currentDaysDisplayed.length === 0}
    <div class="text-center text-gray-500 dark:text-gray-400 py-16 border rounded-2xl dark:border-slate-800 bg-white dark:bg-slate-900">
      <p class="text-lg font-bold">{$t('noStats')}</p>
      <p class="text-sm mt-1">{$t('addShiftsPrompt')}</p>
    </div>
  {:else}
    <!-- Grand Total Hero Card -->
    <div class="bg-gradient-to-br from-green-600 via-emerald-700 to-teal-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden mb-8">
      <div class="absolute -right-10 -bottom-10 w-44 h-44 bg-white opacity-5 rounded-full blur-2xl"></div>
      <div class="absolute -left-10 -top-10 w-44 h-44 bg-green-400 opacity-10 rounded-full blur-2xl"></div>
      
      <span class="text-xs uppercase font-black tracking-wider opacity-75">{$t('monthSalary')}</span>
      <h2 class="text-4xl font-extrabold mt-1 mb-6 font-mono">€ {grandTotals.earnings.toFixed(2)}</h2>
      
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-white/20 pt-5">
        <div>
          <span class="text-xs opacity-75 block">{$t('totalDays')}</span>
          <span class="text-lg font-bold">{grandTotals.days}</span>
        </div>
        <div>
          <span class="text-xs opacity-75 block">{$t('totalHours')}</span>
          <span class="text-lg font-bold font-mono">{grandTotals.hours.toFixed(1)}h</span>
        </div>
        <div>
          <span class="text-xs opacity-75 block">{$t('allowances')}</span>
          <span class="text-lg font-bold font-mono">€ {grandTotals.reimbursements.toFixed(2)}</span>
        </div>
        <div>
          <span class="text-xs opacity-75 block">{$t('totalTips')}</span>
          <span class="text-lg font-bold font-mono">€ {grandTotals.extra.toFixed(2)}</span>
        </div>
      </div>
    </div>

    <!-- Grouped Statistics By Company -->
    <h2 class="text-lg font-black text-gray-800 dark:text-white mb-4">{$t('earningsByCompany')}</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {#each statsByCompany as stats}
        <div class="border rounded-2xl p-5 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-2 mb-3">
              <div class="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <span class="text-base">🏢</span>
              </div>
              <h3 class="font-extrabold text-gray-900 dark:text-white text-base leading-tight">{stats.companyName}</h3>
            </div>
            
            <div class="text-xs flex flex-col gap-2.5 text-gray-500 dark:text-gray-400 mt-4 border-b pb-4 mb-4 dark:border-slate-850">
              <div class="flex justify-between">
                <span>{$t('daysWorked')}:</span>
                <span class="font-bold text-gray-800 dark:text-gray-200">{stats.daysCount}</span>
              </div>
              {#if stats.totalHours > 0}
                <div class="flex justify-between">
                  <span>{$t('totalHours')}:</span>
                  <span class="font-bold text-gray-800 dark:text-gray-200 font-mono">{stats.totalHours.toFixed(1)}h</span>
                </div>
              {/if}
              {#if stats.hourlyEarnings > 0}
                <div class="flex justify-between">
                  <span>{$t('hourlyCompensation')}:</span>
                  <span class="font-bold text-gray-800 dark:text-gray-200 font-mono">€ {stats.hourlyEarnings.toFixed(2)}</span>
                </div>
              {/if}
              {#if stats.fixedEarnings > 0}
                <div class="flex justify-between">
                  <span>{$t('fixedCompensation')}:</span>
                  <span class="font-bold text-gray-800 dark:text-gray-200 font-mono">€ {stats.fixedEarnings.toFixed(2)}</span>
                </div>
              {/if}
              {#if stats.reimbursements > 0}
                <div class="flex justify-between">
                  <span>{$t('expenseReimbursements')}:</span>
                  <span class="font-bold text-gray-800 dark:text-gray-200 font-mono">€ {stats.reimbursements.toFixed(2)}</span>
                </div>
              {/if}
              {#if stats.extraEarnings > 0}
                <div class="flex justify-between">
                  <span>{$t('tips')}:</span>
                  <span class="font-bold text-gray-800 dark:text-gray-200 font-mono">€ {stats.extraEarnings.toFixed(2)}</span>
                </div>
              {/if}
            </div>
          </div>
          
          <div class="flex justify-between items-end mt-2 border-t pt-3 dark:border-slate-850">
            <span class="text-xs uppercase font-extrabold tracking-wider text-gray-400">Subtotal</span>
            <span class="text-xl font-black text-green-600 dark:text-green-400 font-mono">€ {stats.totalEarnings.toFixed(2)}</span>
          </div>
          
          <button
            onclick={() => copySingleCompanyReport(stats)}
            class="mt-4 rounded-xl border border-green-200 dark:border-green-900/60 bg-green-50/50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/40 text-green-700 dark:text-green-300 font-bold text-xs py-2 px-3 transition active:scale-95 flex items-center justify-center gap-1.5 w-full shadow-sm"
          >
            <span>📋</span> {$t('copyReport')}
          </button>
        </div>
      {/each}
    </div>

    <!-- Modern Share / Report Box -->
    <div class="border rounded-2xl p-5 bg-gray-50 dark:bg-slate-900/50 dark:border-slate-800 shadow-inner">
      <div class="flex justify-between items-center mb-3">
        <h3 class="font-bold text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <span>📋</span> {$t('reportDetails')}
        </h3>
        <button
          onclick={copyDetailedReport}
          class="rounded-lg bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-xs py-2 px-3 shadow transition flex items-center gap-1.5"
        >
          <span>🔗</span> {$t('copyReport')}
        </button>
      </div>
      <pre class="bg-white dark:bg-slate-950 p-4 rounded-xl text-[11px] text-gray-600 dark:text-gray-300 font-mono whitespace-pre-wrap leading-relaxed border dark:border-slate-850 max-h-60 overflow-y-auto select-all shadow-sm">{reportText}</pre>
    </div>
  {/if}
</div>
