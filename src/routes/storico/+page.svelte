<script lang="ts">
  import { onMount } from 'svelte';
  import { parse, format } from 'date-fns';
  import { DB } from '$lib/database';

  let guadagniMensili: Map<string, { totalWage: number }> = $state(new Map());

  async function calcolaGuadagniMensili() {
    guadagniMensili = new Map<string, { totalWage: number }>();
    for (const wage of (await DB.getWorkedDays()) ?? []) {
      const data = format(wage.date, 'yyyy-MM');
      if (guadagniMensili.get(data)) continue;
      guadagniMensili.set(data, {
        totalWage: await DB.getTotalCompensationOfMouth(wage.date)
      });
    }
    console.log(guadagniMensili);

    guadagniMensili = guadagniMensili;
  }

  // Initial calculation on mount
  onMount(() => {
    calcolaGuadagniMensili();
  });
</script>

<div class="m-auto my-5 p-4 lg:w-4/5 xl:w-2/3">
  <div class="flex items-center justify-between border-b pb-4 mb-6 dark:border-slate-800">
    <h1 class="text-2xl font-black text-gray-900 dark:text-white">Storico Guadagni</h1>
  </div>

  {#if guadagniMensili.size === 0}
    <div class="text-center text-gray-500 dark:text-gray-400 py-16 border rounded-2xl dark:border-slate-800 bg-white dark:bg-slate-900">
      <p class="text-lg">Nessun dato storico disponibile.</p>
      <p class="text-sm mt-1">Registra dei turni per iniziare a visualizzare lo storico.</p>
    </div>
  {:else}
    <div class="flex flex-col gap-4">
      {#each guadagniMensili.entries() as [k, v]}
        <div class="flex items-center justify-between rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white hover:shadow-md transition">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-950 flex items-center justify-center">
              <span class="text-lg">📅</span>
            </div>
            <div>
              <span class="text-lg font-black capitalize block leading-tight">
                {format(parse(k, 'yyyy-MM', new Date()), 'MMMM yyyy')}
              </span>
              <span class="text-xs text-gray-400 dark:text-gray-500">Riepilogo stipendio del mese</span>
            </div>
          </div>
          <div class="text-right">
            <span class="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider block">Totale</span>
            <span class="text-xl font-black text-green-600 dark:text-green-400">
              € {v.totalWage}
            </span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
