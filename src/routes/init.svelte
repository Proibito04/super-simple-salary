<script lang="ts">
  let pagaOraria: number = $state(0);

  interface Props {
    salvato?: boolean;
  }

  let { salvato = $bindable(false) }: Props = $props();

  async function salvaPaga() {
    salvato = true;
  }
</script>

<div>
  <label for="paga" class="text-xl">Inserisci la tua paga oraria:</label>
  <input type="number" id="paga" bind:value={pagaOraria} />
  <button onclick={salvaPaga}>Salva</button>
</div>
