<script lang="ts">
	import Icon from '@iconify/svelte'

	// Potential future use: Fetching summary data to display on cards
	// export let data;
</script>

<div class="container mx-auto p-4 space-y-6">
	<h1 class="text-center mb-6">Performance Analytics</h1>

	<!-- Overall Long-Term Trends Card -->
	<a href="/analytics/long-term">
		<div class = 'card p-4 hover:preset-tonal-primary'>
			<h1 class="mb-2">Overall Long-Term Trends</h1>
			<p class="mb-3 text-gray-500 dark:text-gray-400 leading-tight">
				Track your workout volume, fatigue, stimulus-to-fatigue ratio (SFR), and subjective feedback
				over time across all workouts.
		</p>
		<span class="flex items-center text-primary-600 dark:text-primary-500">
			View Trends <Icon icon="fa6-solid:arrow-right" class="w-3.5 h-3.5 ml-2" />
		</span>
	</div>
	</a>

	<!-- Exercise Performance Card -->
	<a href="/exercises/list">
		<div class = 'card p-4 hover:preset-tonal-primary'>
			<!-- Linking to /exercises/list as it contains links to individual analytics -->
			<h1 class="mb-2">Exercise Performance</h1>
			<p class="mb-3 text-gray-500 dark:text-gray-400 leading-tight">
				Dive into specific exercises. See your rep maxes, set counts, latest performance, and links to
				detailed exercise analytics.
			</p>
			<span class="flex items-center text-primary-600 dark:text-primary-500">
				Analyze Exercises <Icon icon="fa6-solid:arrow-right" class="w-3.5 h-3.5 ml-2" />
			</span>
		</div>
	</a>
	<!-- Muscle Group Analysis Card (Placeholder Link) -->
	<div class = 'card p-4 opacity-70 hover:preset-tonal-secondary' href="/analytics/muscle-group">
		<!-- Using opacity and secondary color to indicate it might be upcoming/different -->
		<h1 class="mb-2">Muscle Group Analysis</h1>
		<p class="mb-3 text-gray-500 dark:text-gray-400 leading-tight">
			Analyze training volume, set counts, and recovery trends aggregated by muscle group. (Coming
			Soon / Requires Setup)
		</p>
		<span class="flex items-center text-secondary-600 dark:text-secondary-500">
			Explore Muscle Groups <Icon icon="fa6-solid:arrow-right" class="w-3.5 h-3.5 ml-2" />
		</span>
		<!-- We'll need to create the /analytics/muscle-group route later -->
	</div>

	<!-- Add more cards here for future analytics sections -->

</div>

<style>
	/* Optional: Add custom styles if needed */
	.container {
		max-width: 600px; /* Limit width on larger screens for better readability */
	}
</style>
