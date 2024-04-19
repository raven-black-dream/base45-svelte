<script lang="ts">
	export let set: {id: number, exercises: {id: string, exercise_name:string, weighted: boolean, weight_step:number, muscle_group:string}, 
    reps:number, target_reps:number, target_weight:number, weight:number, is_first:boolean, is_last:boolean};
    export let i: number;
    export let len: number;
</script>

<form class="p-4" method="post">
                    <div class="input-group input-group-divider grid-cols-[1fr_1fr_auto]">
                    <input type="hidden" name="set_id" value={set.id}>
                    <input type="hidden" name="exercise_id" value={set.exercises.id}>
                    <input type="hidden" name="exercise_name" value={set.exercises.exercise_name}>
                    <input type="hidden" name="muscle_group" value={set.exercises.muscle_group}>
                    <input 
                        class="input" 
                        type="number" name="actualreps" 
                        value="{set.reps? set.reps: set.target_reps}"
                    />
                    <input 
                        class="input" 
                        type="number" 
                        name="actualweight"
                        value="{set.weight? set.weight: set.target_weight}"
                    />
                    <input type="hidden" name="is_first" value={set.is_first} />
                    <input type="hidden" name="is_last" value={set.is_last} />
                    <input type="hidden" name="is_last_set" value={i === len}>
                    <button class="btn variant-ghost-primary" type="submit" formaction="?/feedback">
                        Log Set
                    </button>
                    </div>
                </form>                

<style>
    hr.solid {
        border-top: 3px solid rgba(var(--color-surface-500) / 1);
        padding-bottom: 24px;
    }
</style>

