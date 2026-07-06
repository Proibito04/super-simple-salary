<script lang="ts">
  import { run } from 'svelte/legacy';

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
  let ref: any = $state();
  run(() => {
    ref && document.body.appendChild(ref);
  });
</script>

<div
  bind:this={ref}
  class="fixed top-0 flex h-screen w-full flex-wrap justify-center bg-slate-300 bg-opacity-60 p-5 align-middle"
>
  {@render children?.()}
</div>
