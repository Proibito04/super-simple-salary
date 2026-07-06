<script lang="ts">
  import { DB } from '$lib/database';
  import { format, parse } from 'date-fns';
  import { onMount } from 'svelte';

  let guadagniMensili: Map<string, number> = $state(new Map());
  let totaleWageMap: Map<string, { totalWage: number }> = $state(new Map());

  async function calcolaGuadagniMensili() {
    guadagniMensili = new Map<string, number>();
    for (const wage of (await DB.getWorkedDays()) ?? []) {
      const data = format(wage.date, 'yyyy-MM');
      if (guadagniMensili.get(data)) continue;
      const payment = await DB.getSinglePaymentHistory(data);
      guadagniMensili.set(data, payment?.payment || 0);
    }

    guadagniMensili = guadagniMensili;
  }

  async function totalMonthWage() {
    totaleWageMap = new Map<string, { totalWage: number }>();
    for (const wage of (await DB.getWorkedDays()) ?? []) {
      const data = format(wage.date, 'yyyy-MM');
      if (totaleWageMap.get(data)) continue;
      totaleWageMap.set(data, {
        totalWage: await DB.getTotalCompensationOfMouth(wage.date)
      });
    }

    totaleWageMap = totaleWageMap;
  }

  onMount(async () => {
    await totalMonthWage();
    await calcolaGuadagniMensili();
  });

  async function updateWage(el: Event, data: string) {
    const inputElement = el.target as HTMLInputElement;
    const value = parseInt(inputElement.value) || 0;

    await DB.updatePaymentHistory(data, value);

    guadagniMensili.set(data, value);
    guadagniMensili = guadagniMensili;
  }
</script>

<div class="m-auto my-5 p-4 lg:w-4/5 xl:w-2/3">
  <div class="flex items-center justify-between border-b pb-4 mb-6 dark:border-slate-800">
    <h1 class="text-2xl font-black text-gray-900 dark:text-white">Stato Pagamenti</h1>
  </div>

  {#if guadagniMensili.size === 0}
    <div class="text-center text-gray-500 dark:text-gray-400 py-16 border rounded-2xl dark:border-slate-800 bg-white dark:bg-slate-900">
      <p class="text-lg">Nessun dato di pagamento disponibile.</p>
      <p class="text-sm mt-1">Registra dei turni per calcolare gli stipendi mensili.</p>
    </div>
  {:else}
    <div class="flex flex-col gap-4">
      {#each guadagniMensili.entries() as [k, v]}
        {@const monthWage = totaleWageMap.get(k)?.totalWage || 0}
        {@const remaining = monthWage - v}
        
        <div class="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-850 dark:bg-slate-900 dark:text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-2.5 mb-1">
              <div class="w-8 h-8 rounded-lg bg-green-150 dark:bg-green-950 flex items-center justify-center">
                <span class="text-sm">💰</span>
              </div>
              <h3 class="text-lg font-black capitalize">{format(parse(k, 'yyyy-MM', new Date()), 'MMMM yyyy')}</h3>
            </div>
            
            <div class="flex gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
              <div>
                <span>Stipendio Totale:</span>
                <span class="font-extrabold text-gray-800 dark:text-gray-200 block text-sm">€ {monthWage.toFixed(2)}</span>
              </div>
              <div>
                <span>Stato:</span>
                {#if remaining > 0}
                  <span class="inline-block bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded font-black dark:bg-amber-950 dark:text-amber-300 block mt-0.5">
                    DA RICEVERE: € {remaining.toFixed(2)}
                  </span>
                {:else}
                  <span class="inline-block bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded font-black dark:bg-green-950 dark:text-green-300 block mt-0.5">
                    PAGATO INTERAMENTE
                  </span>
                {/if}
              </div>
            </div>
          </div>
          
          <div class="w-full sm:w-auto border-t sm:border-t-0 sm:border-l pt-3 sm:pt-0 sm:pl-5 dark:border-slate-800 flex flex-col justify-end min-w-[200px]">
            <label for={`input-pay-${k}`} class="block text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Acconto / Ricevuto (€)</label>
            <div class="relative rounded-lg shadow-sm">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span class="text-gray-500 text-sm font-semibold">€</span>
              </div>
              <input
                type="number"
                id={`input-pay-${k}`}
                onkeyup={(event) => updateWage(event, k)}
                value={v}
                class="block w-full rounded-xl border border-gray-300 bg-gray-50 py-2 pl-7 pr-3 text-sm text-gray-900 font-bold focus:border-green-600 focus:ring-green-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
