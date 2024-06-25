<script lang="ts">
    import type { LayoutData } from './$types';
    
    export let data: LayoutData;
</script>

<div class='card p-4 variant-glass-primary'>
    <header class='card-header'>Hello! {data.profile?.display_name}</header>
    <section>
        <slot></slot>
    </section>
    <footer class='card-footer'></footer>
</div>