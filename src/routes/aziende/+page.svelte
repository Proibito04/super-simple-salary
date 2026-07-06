<script lang="ts">
  import { onMount } from 'svelte'
  import { DB } from '$lib/database'
  import { toasts } from '$lib/toast'
  import { t } from '$lib/i18n'
  import type { Company } from '../../types'

  let companies: Company[] = $state([])
  
  function generateId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  let newName = $state('')
  let newHourlyWage = $state(10)
  let showAddForm = $state(false)
  let editingCompanyId = $state<string | null>(null)

  // Dynamic custom settings for the company being created/edited
  let tempSettings: { id?: string; name: string; amount: number }[] = $state([])
  let nextSettingName = $state('')
  let nextSettingAmount = $state(10)

  async function loadCompanies() {
    companies = await DB.getCompanies()
  }

  function addTempSetting() {
    if (!nextSettingName.trim()) return
    tempSettings = [...tempSettings, {
      name: nextSettingName.trim(),
      amount: nextSettingAmount
    }]
    nextSettingName = ''
    nextSettingAmount = 10
  }

  function removeTempSetting(index: number) {
    tempSettings = tempSettings.filter((_, i) => i !== index)
  }

  function editCompany(company: Company) {
    editingCompanyId = company.id
    newName = company.name
    newHourlyWage = company.hourlyWage
    tempSettings = (company.customSettings || []).map(s => ({
      id: s.id,
      name: s.name,
      amount: s.amount
    }))
    showAddForm = true
  }

  async function saveCompany() {
    if (!newName.trim()) return

    const newCompany: Company = {
      id: editingCompanyId || generateId(),
      name: newName.trim(),
      hourlyWage: newHourlyWage,
      customSettings: tempSettings.map(s => ({
        id: s.id || generateId(),
        name: s.name,
        amount: s.amount
      }))
    }

    try {
      await DB.addCompany(newCompany)
      toasts.show($t('companySavedSuccess'), "success");
      newName = ''
      newHourlyWage = 10
      tempSettings = []
      showAddForm = false
      editingCompanyId = null
      await loadCompanies()
    } catch (e: any) {
      toasts.show("Error: " + (e.message || String(e)), "error");
      console.error(e);
    }
  }

  async function deleteCompany(id: string) {
    if (confirm($t('confirmDeleteCompany'))) {
      try {
        await DB.deleteCompany(id)
        toasts.show($t('companyDeletedSuccess'), "success");
        await loadCompanies()
      } catch (e: any) {
        toasts.show("Error: " + (e.message || String(e)), "error");
      }
    }
  }

  onMount(() => {
    loadCompanies()
  })
</script>

<div class="m-auto my-5 p-4 lg:w-4/5 xl:w-2/3 font-sans">
  <div class="flex items-center justify-between border-b pb-4 dark:border-slate-800">
    <h1 class="text-2xl font-black text-gray-900 dark:text-white">{$t('companies')}</h1>
    <button
      class="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 shadow-md active:scale-95 transition"
      onclick={() => {
        showAddForm = !showAddForm;
        if (!showAddForm) {
          editingCompanyId = null;
          newName = '';
          newHourlyWage = 10;
          tempSettings = [];
        }
      }}
    >
      {$t('addCompany')}
    </button>
  </div>

  <!-- Modal overlay for adding / editing a company -->
  {#if showAddForm}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div class="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border dark:border-slate-800 dark:bg-slate-900 dark:text-white">
        
        <!-- Header -->
        <div class="flex items-center justify-between border-b pb-3 mb-5">
          <h2 class="text-xl font-black text-gray-900 dark:text-white text-green-600">
            {editingCompanyId ? $t('editCompany') : $t('addCompany')}
          </h2>
          <button
            type="button"
            class="rounded-xl border px-3 py-1.5 text-xs font-bold hover:bg-gray-100 dark:border-slate-800 dark:hover:bg-slate-800 transition"
            onclick={() => {
              showAddForm = false;
              editingCompanyId = null;
              newName = '';
              newHourlyWage = 10;
              tempSettings = [];
            }}
          >
            {$t('close')}
          </button>
        </div>

        <div class="flex flex-col gap-4">
          <!-- Company Name -->
          <div>
            <label for="comp-name" class="block text-xs font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500">{$t('companyNameLabel')} *</label>
            <input
              id="comp-name"
              type="text"
              bind:value={newName}
              class="mt-1.5 block w-full rounded-xl border border-gray-300 p-2.5 text-sm text-gray-900 shadow-sm focus:border-green-500 focus:ring-green-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-bold"
              placeholder="E.g., Gourmet in Villa"
              required
            />
          </div>

          <!-- Hourly Wage -->
          <div>
            <label for="comp-wage" class="block text-xs font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold">{$t('hourlyWageLabel')} (€/h)</label>
            <input
              id="comp-wage"
              type="number"
              bind:value={newHourlyWage}
              min="0"
              step="0.5"
              class="mt-1.5 block w-[150px] rounded-xl border border-gray-300 p-2.5 text-sm text-gray-900 shadow-sm focus:border-green-500 focus:ring-green-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-bold font-mono"
            />
          </div>

          <!-- Dynamic Settings / Allowances Builder -->
          <div class="border-t pt-4 dark:border-slate-850">
            <span class="block text-xs font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">{$t('customAllowancesLabel')}</span>
            
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end mb-4">
              <div class="sm:col-span-2">
                <label for="setting-name" class="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500">{$t('companyNameLabel')}</label>
                <input
                  id="setting-name"
                  type="text"
                  bind:value={nextSettingName}
                  placeholder={$t('allowanceNamePlaceholder')}
                  class="mt-1 block w-full rounded-xl border border-gray-300 p-2.5 text-sm text-gray-900 focus:border-green-500 focus:ring-green-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div class="flex gap-2 items-end">
                <div class="flex-1 font-bold">
                  <label for="setting-amount" class="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500">€</label>
                  <input
                    id="setting-amount"
                    type="number"
                    bind:value={nextSettingAmount}
                    min="0"
                    step="1"
                    class="mt-1 block w-full rounded-xl border border-gray-300 p-2.5 text-sm text-gray-900 focus:border-green-500 focus:ring-green-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-bold font-mono"
                  />
                </div>
                <button
                  type="button"
                  onclick={addTempSetting}
                  class="rounded-xl bg-green-600 px-4 py-2.5 font-bold text-sm text-white hover:bg-green-700 active:scale-95 transition"
                >
                  +
                </button>
              </div>
            </div>

            <!-- Temp list of settings rendered as beautiful tags -->
            {#if tempSettings.length > 0}
              <div class="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-slate-950/40 rounded-2xl border dark:border-slate-800">
                {#each tempSettings as setting, idx}
                  <div class="flex items-center gap-2 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 px-3 py-1.5 rounded-xl text-xs font-bold text-green-800 dark:text-green-300">
                    <span>{setting.name}: <strong class="font-mono">€{setting.amount}</strong></span>
                    <button
                      type="button"
                      onclick={() => removeTempSetting(idx)}
                      class="text-red-500 hover:text-red-750 text-sm font-black focus:outline-none ml-1 active:scale-95"
                    >
                      ✕
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Form Actions -->
          <div class="flex justify-end gap-3 mt-4 border-t pt-4 dark:border-slate-800">
            <button
              class="rounded-xl border px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-slate-750 dark:text-gray-300 dark:hover:bg-slate-800 transition active:scale-95"
              onclick={() => {
                showAddForm = false;
                editingCompanyId = null;
                newName = '';
                newHourlyWage = 10;
                tempSettings = [];
              }}
            >
              {$t('cancel')}
            </button>
            <button
              class="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 transition active:scale-95 shadow-md"
              onclick={saveCompany}
            >
              {$t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <div class="mt-6 flex flex-col gap-4">
    {#if companies.length === 0}
      <p class="text-center text-gray-500 dark:text-gray-400 py-10 font-bold">{$t('noCompaniesYet')}</p>
    {:else}
      {#each companies as company}
        <div class="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white hover:shadow-md transition gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-7 h-7 rounded bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <span class="text-xs">🏢</span>
              </div>
              <h3 class="text-base font-extrabold">{company.name}</h3>
            </div>
            <div class="mt-1 flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
              <span>{$t('hourlyWageLabel')}: <strong class="font-mono">€ {company.hourlyWage}/h</strong></span>
              {#if company.customSettings && company.customSettings.length > 0}
                <div class="mt-2.5 flex flex-wrap gap-1.5">
                  {#each company.customSettings as setting}
                    <span class="inline-block bg-green-50 text-green-800 text-[10px] px-2.5 py-1 rounded-full font-black dark:bg-green-950 dark:text-green-300 font-mono">
                      {setting.name}: € {setting.amount}
                    </span>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
          <div class="flex gap-2 justify-end">
            <button
              class="rounded-xl bg-green-600 hover:bg-green-700 px-3.5 py-2 text-xs font-bold text-white transition active:scale-95"
              onclick={() => editCompany(company)}
            >
              {$t('edit')}
            </button>
            {#if company.id !== 'default'}
              <button
                class="rounded-xl bg-red-600 hover:bg-red-700 px-3.5 py-2 text-xs font-bold text-white transition active:scale-95"
                onclick={() => deleteCompany(company.id)}
              >
                {$t('remove')}
              </button>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
