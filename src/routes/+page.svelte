<script lang="ts">
  import { onMount } from 'svelte';
  import SummaryDays from './summaryDays.svelte';
  import { DB } from '$lib/database';
  import { t, currentLang, getTranslatedMonth } from '$lib/i18n';

  let totalWageMonth = $state(0);

  onMount(async () => {
    update();
  });

  async function update() {
    totalWageMonth = await DB.getTotalCompensationOfMouth(new Date());
  }

  DB._workedDays.subscribe(async () => {
    update();
  });
</script>

<div class="m-auto my-5 p-4 lg:w-4/5 xl:w-2/3">
  <!-- Modern Hero Salary Card -->
  <div class="bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden mb-8">
    <div class="absolute -right-10 -bottom-10 w-44 h-44 bg-white opacity-5 rounded-full blur-2xl"></div>
    <div class="absolute -left-10 -top-10 w-44 h-44 bg-green-400 opacity-10 rounded-full blur-2xl"></div>
    
    <span class="text-xs uppercase font-black tracking-wider opacity-75">{$t('salary')} {getTranslatedMonth(new Date(), $currentLang)}</span>
    <div class="flex items-baseline gap-2 mt-1">
      <h2 class="text-4xl font-extrabold font-mono">€ {totalWageMonth}</h2>
      <span class="text-2xl animate-pulse">🤑</span>
    </div>
  </div>

  <h2 class="text-lg font-black text-gray-800 dark:text-white mb-4">{$t('recentShifts')}</h2>
  <SummaryDays />
</div>
