<script context="module">
  import { blur, crossfade } from "svelte/transition";
  let lockonCounter = 0;
  let stunnedCounter = 0;
  let counter = 0;

  // @ts-expect-error the only issue is that crossfade can take a fn for duration and blur can't
  let [send, recv] = crossfade({ fallback: blur });
</script>

<script lang="ts">
  import type { AccDiffHudBase, AccDiffHudTarget } from "./index";

  import { onMount } from "svelte";
  import { fly } from "svelte/transition";

  import tippy from "tippy.js";

  import Plugin from "./Plugin.svelte";
  import HudCheckbox from "../components/HudCheckbox.svelte";

  export let target: AccDiffHudBase | AccDiffHudTarget;
  export let onlyTarget: boolean = false;

  function isTarget(v: any): v is AccDiffHudTarget {
    return v?.target;
  }

  export let id = `accdiff-total-display-${counter++}`;
  let lockonId = isTarget(target) ? `accdiff-total-display-consume-lockon-${lockonCounter++}` : "";
  let stunnedId = isTarget(target) ? `accdiff-total-display-stunned-${stunnedCounter++}` : "";

  function toggleLockOn() {
    if (isTarget(target) && target.lockOnAvailable) {
      target.consumeLockOn = !target.consumeLockOn;
    }
  }

  let pluginClasses = Object.values(target.plugins)
    .filter(plugin => {
      return plugin.uiElement == "checkbox" && plugin.uiState;
    })
    .map(plugin => `accdiff-total-${plugin.slug}`)
    .join(" ");

  let imgElement: HTMLElement;
  let dropdownElement: HTMLElement;

  onMount(() => {
    if (imgElement && dropdownElement) {
      tippy(imgElement, {
        content: dropdownElement,
        interactive: true,
        allowHTML: true,
        trigger: "click mouseenter",
        placement: "right",
      });
    }
  });
</script>

{#if isTarget(target)}
  <div
    in:send={{ key: `${id}-img`, delay: 100, duration: 200 }}
    out:recv={{ key: `${id}-img`, duration: 200 }}
    class="accdiff-grid lancer-hit-thumb accdiff-target-has-dropdown {pluginClasses}"
  >
    <img
      class:accdiff-target-prone={target.prone}
      alt={target.target.name ?? undefined}
      src={target.target.actor?.img}
      bind:this={imgElement}
    />
    {#if target.stunned}
      <label transition:blur for={stunnedId} class="stunned-label" title="Stunned">
        <i class="cci cci-condition-stunned i--sm" />
      </label>
    {/if}
    <label
      for={lockonId}
      class="lockon-label"
      class:checked={target.usingLockOn}
      class:disabled={!target.lockOnAvailable}
      title="Consume Lock On (+1)"
    >
      <i
        class="cci cci-condition-lock-on"
        class:i--click={target.lockOnAvailable}
        class:i--sm={!target.usingLockOn}
        class:i--l={target.usingLockOn}
        on:click={toggleLockOn}
        on:keypress={toggleLockOn}
      />
      <HudCheckbox
        label="Consume Lock On (+1)"
        checked={!!target.usingLockOn}
        bind:value={target.consumeLockOn}
        disabled={!target.lockOnAvailable}
        visible={false}
      />
    </label>
  </div>
  {#if !onlyTarget}
    <div class="accdiff-target-dropdown" bind:this={dropdownElement}>
      {#each Object.keys(target.plugins) as key}
        <Plugin bind:data={target.plugins[key]} />
      {/each}
    </div>
  {/if}
{/if}
<div class="accdiff-grid accdiff-weight" in:send={{ key: id }} out:recv={{ key: id }}>
  <div
    class="grid-enforcement total-container {pluginClasses}"
    class:accurate={target.total > 0}
    class:inaccurate={target.total < 0}
  >
    <!-- #key blocks currently break |local, see https://github.com/sveltejs/svelte/issues/5950 -->
    {#each [target.total] as total (target.total)}
      <div {id} transition:blur class="card clipped total">
        <span in:fly|local={{ y: -50, duration: 400 }} out:fly|local={{ y: 50, duration: 200 }}>
          {Math.abs(total)}
        </span>
        <i
          in:fly|local={{ y: -50, duration: 200 }}
          out:fly|local={{ y: 50, duration: 200 }}
          class="cci i--m i--dark white--text middle"
          class:cci-accuracy={total >= 0}
          class:cci-difficulty={total < 0}
        />
      </div>
    {/each}
  </div>
</div>

<style lang="scss">
  i {
    border: none;
  }

  .accdiff-grid {
    position: relative;
  }

  .card.clipped {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 8px 8px 8px 16px;
    color: white;
    width: min-content;
    background-color: var(--dark-gray-color);
  }
  .total-container {
    filter: drop-shadow(1px 1px 0px);
  }
  .accurate > .card.total {
    background-color: var(--accurate-color);
  }
  .total-container.accurate {
    filter: drop-shadow(1px 1px 0px #013904);
  }
  .inaccurate > .card.total {
    background-color: var(--difficult-color);
  }
  .total-container.inaccurate {
    filter: drop-shadow(1px 1px 0px #5c0d0d);
  }
  .disabled {
    opacity: 0.4;
  }
  .lancer-hit-thumb {
    margin-right: 0px;
    margin-left: 4px;
    margin-bottom: 4px;
    & img {
      border: none;
      transition: all 200ms ease-in-out;
    }
  }

  label {
    position: absolute;

    &.lockon-label {
      right: -4px;
      top: -4px;
    }
    &.stunned-label {
      left: -4px;
      top: -4px;
    }
  }

  @keyframes lockon {
    70% {
      text-shadow: 0 0 5px #017934;
    }
    80% {
      text-shadow: 0 0 5px color-mix(in srgb, #017934, white 35%);
    }
    90% {
      text-shadow: 0 0 5px #017934;
    }
  }
  .cci-condition-lock-on {
    text-shadow: 0 0 3px white;
    transition: font-size 200ms;
  }
  .cci-condition-lock-on.i--l {
    animation: lockon 800ms linear 1s infinite alternate;
  }

  .cci-condition-stunned {
    text-shadow: 0 0 3px var(--primary-color);
  }

  .accdiff-target-dropdown {
    display: none;
  }

  .accdiff-target-prone {
    transform: rotate(90deg);
  }

  @keyframes blur {
    30% {
      filter: none;
      opacity: 0.9;
    }
    35% {
      filter: blur(1px);
      opacity: 0.7;
    }
    40% {
      filter: blur(2px);
      opacity: 0.5;
    }
    43% {
      filter: blur(1px);
      opacity: 0.5;
    }
    50% {
      filter: none;
      opacity: 0.9;
    }
  }

  :global(.accdiff-total-invisibility) img {
    animation: blur 2s linear 1s infinite alternate;
  }

  :global(.tippy-content) .accdiff-target-dropdown {
    display: block;
  }

  .accdiff-grid :global(.tippy-box) {
    font-size: 0.8em;
    padding-left: 0px;
    padding-right: 0px;
    padding-top: 0px;
    padding-bottom: 4px;
    transform: none;
  }
  .accdiff-grid :global(.tippy-box .tippy-content) {
    transform: none;
  }
  .accdiff-grid :global(.tippy-box .tippy-content .container) {
    margin: 0px;
  }
  .accdiff-grid :global(.tippy-box .tippy-content .checkmark) {
    height: 12px;
  }
</style>
