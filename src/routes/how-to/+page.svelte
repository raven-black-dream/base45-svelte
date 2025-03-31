<!-- src/routes/how-to/+page.svelte -->
<script lang="ts">
    // Potential imports if we use Skeleton components later
    // import { Accordion } from '@skeletonlabs/skeleton-svelte';
    // let value = $state([]);
    import Icon from '@iconify/svelte';
</script>

<svelte:head>
    <title>How To Use BASE45</title>
</svelte:head>

<!-- Main container for padding and max-width -->
<div class="max-w-4xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8">

    <h1 class="h1">How to Use BASE45 (Alpha Version)</h1>

    <section class="alert preset-filled-warning-300-700">
        <!-- Icon -->
        <Icon icon="fa6-solid:triangle-exclamation" class="text-xl" />
        <!-- Slot -->
        <div class="alert-message">
            <h3 class="h3">Alpha Notice</h3>
            <p>
                Welcome! BASE45 is currently in alpha testing. This means features are still under development, and you might encounter bugs or errors (especially around workout completion).
                Your usage and feedback are crucial for improvement. Please report any issues you find.
            </p>
        </div>
        <!-- Slot: Footer -->
        <!-- <svelte:fragment slot="footer">...</svelte:fragment> -->
    </section>

    <section class="card p-3 md:p-4 preset-tonal-surface">
        <h2 class="h2">Getting Started: Initial Login & Setup</h2>
        <p class="mt-2 md:mt-3">
            Upon your first login, you may be prompted to enter some initial information required for the application to function correctly, such as basic profile details or fitness experience.
            Follow the on-screen prompts.
        </p>
    </section>

    <section class="card p-3 md:p-4 preset-tonal-surface">
        <h2 class="h2">Navigating the App</h2>
        <p class="mt-2 md:mt-3">
            Use the sidebar (usually accessible via a menu icon <i class="fa-solid fa-bars"></i> on mobile, or always visible on larger screens) to navigate between the main sections:
        </p>
        <ul class="list-disc list-inside space-y-1 md:space-y-2 mt-2 md:mt-3 ml-3 md:ml-4">
            <li><strong>Dashboard/Home:</strong> Overview of your current status or next workout.</li>
            <li><strong>Programs:</strong> View available program templates and manage your created mesocycles.</li>
            <li><strong>Workouts:</strong> View your schedule and record workouts.</li>
            <li><strong>Exercises:</strong> Browse the exercise database.</li>
            <li><strong>Account/Profile:</strong> Manage your settings.</li>
        </ul>
    </section>

    <section class="card p-3 md:p-4 preset-tonal-surface">
        <h2 class="h2">Programs & Mesocycles</h2>

        <h3 class="h3 mt-3 md:mt-4">1. Program Templates</h3>
        <p class="mt-2 md:mt-3">
            The application uses program templates as a blueprint for your training weeks. These define the structure, like which days you train and which muscle groups are targeted each day.
            You can browse existing public templates.
        </p>
        <p class="mt-2 md:mt-3">
            If you don't see a template that fits your goals, please let the development team know what you're looking for.
            Alternatively, you can now create your own custom program template! Navigate to the <a href="/programs/create" class="anchor">Create Program</a> page (link typically found on the main Programs page or sidebar) to define the number of workout days per week and the muscle groups targeted for each day.
        </p>

        <h3 class="h3 mt-3 md:mt-4">2. Create a Mesocycle</h3>
        <p class="mt-2 md:mt-3">
            Once you've chosen a template, you can create a "mesocycle" from it. A mesocycle represents a specific training block, typically lasting 4-6 weeks.
        </p>
        <p class="mt-2 md:mt-3">
            When creating a mesocycle, you'll select the specific exercises you want to perform for the muscle groups assigned to each day in the template.
            If an exercise you need is missing from the list, you can add it yourself using the <a href="/exercises/create" class="anchor">Create Exercise</a> feature (see details below).
        </p>
        <p class="mt-2 md:mt-3">
            After creating the mesocycle, you'll see a list of your scheduled workout days.
        </p>
    </section>

    <section class="card p-3 md:p-4 preset-tonal-surface">
        <h2 class="h2">Creating Program Templates</h2>
        <p class="mt-2 md:mt-3">
            If the existing program templates don't match your training style or goals, you can create your own!
        </p>
        <ol class="list-decimal list-inside space-y-1 md:space-y-2 mt-2 md:mt-3 ml-3 md:ml-4">
            <li>Navigate to the <a href="/programs/create" class="anchor">Create Program</a> page.</li>
            <li>Enter a unique <strong>Name</strong> for your template.</li>
            <li>Decide if the template should be <strong>Public</strong> (visible to others) or private (only visible to you) using the checkbox.</li>
            <li>Define each workout day:
                <ul class="list-disc list-inside space-y-1 md:space-y-2 mt-1 md:mt-2 ml-3 md:ml-4">
                    <li>Give the day a descriptive name (e.g., "Push Day", "Lower Body", "Day 1").</li>
                    <li>For each day, add the <strong>Muscle Groups</strong> you plan to train.</li>
                    <li>Specify the target <strong>Number of Sets</strong> for each muscle group on that day.</li>
                    <li>Use the buttons within the day form to add/remove muscle groups for that specific day.</li>
                </ul>
            </li>
            <li>Click the <strong><i class="fa-solid fa-plus"></i> Button</strong> (typically below the last day defined) to add more workout days to your template/split.</li>
            <li>Click the button to remove a specific day if needed.</li>
            <li>Once you've defined all the days and their muscle groups/sets, click the <strong>Create Program Template</strong> button.</li>
        </ol>
        <p class="mt-2 md:mt-3">
            Your custom template will now be available for selection when you create a new mesocycle.
        </p>
    </section>

    <section class="card p-3 md:p-4 preset-tonal-surface">
        <h2 class="h2">Creating Custom Exercises</h2>
        <p class="mt-2 md:mt-3">
            Need an exercise that isn't already in the database? You can add your own!
        </p>
        <ol class="list-decimal list-inside space-y-1 md:space-y-2 mt-2 md:mt-3 ml-3 md:ml-4">
            <li>Navigate to the <a href="/exercises/create" class="anchor">Create Exercise</a> page (link typically found on the main <a href="/exercises/list" class="anchor">Exercises</a> page or sidebar).</li>
            <li>Fill in the required details:
                <ul class="list-disc list-inside space-y-1 md:space-y-2 mt-1 md:mt-2 ml-3 md:ml-4">
                    <li><strong>Exercise Name:</strong> The unique name for your exercise.</li>
                    <li><strong>Muscle Group:</strong> Select the primary muscle group worked.</li>
                    <li><strong>Weighted:</strong> Indicate if the exercise typically involves added weight.</li>
                    <li><strong>Weight Step:</strong> (If weighted) Specify the smallest increment you typically adjust the weight by (e.g., 2.5, 5).</li>
                </ul>
            </li>
            <li>Submit the form to add the exercise to your personal list, making it available when creating or modifying mesocycles.</li>
        </ol>
    </section>

    <section class="card p-3 md:p-4 preset-tonal-surface">
        <h2 class="h2">Recording a Workout</h2>
        <ol class="list-decimal list-inside space-y-1 md:space-y-2 mt-2 md:mt-3 ml-3 md:ml-4">
            <li>From your list of scheduled workouts, click the "Record Workout" button on the upcoming workout you want to perform.</li>
            <li>
                You'll see a list of exercises for the day, each with target sets, reps, and potentially RIR (Reps In Reserve).
            </li>
            <li>
                As you complete each set, enter the number of <strong>Reps</strong> performed and the <strong>Weight</strong> used.
            </li>
            <li>Click the "Log Set" button (often represented by a checkmark or similar icon) next to the set details.</li>
            <li>Once you have logged all sets for all exercises, click the "Mark Workout Complete" button at the bottom of the page.</li>
        </ol>
    </section>

    <section class="card p-3 md:p-4 preset-tonal-surface">
        <h2 class="h2">Post-Workout Feedback</h2>
        <p class="mt-2 md:mt-3">
            You'll be prompted to answer feedback questions at specific points during your workout to help the system adjust future sessions. Here's when they appear:
        </p>
        <ul class="list-disc list-inside space-y-2 md:space-y-3 mt-2 md:mt-3 ml-3 md:ml-4">
            <li>
                <strong>After the first set of an exercise (from the second workout onwards in a mesocycle):</strong>
                <ul class="list-disc list-inside space-y-1 mt-1 md:mt-2 ml-3 md:ml-4">
                    <li>You'll be asked about how the relevant <strong>muscle group recovered</strong> since the last time you trained it.</li>
                </ul>
            </li>
            <li>
                <strong>After the last set of an exercise (but *not* the last set for that muscle group in the workout):</strong>
                <ul class="list-disc list-inside space-y-1 mt-1 md:mt-2 ml-3 md:ml-4">
                    <li>You'll be asked about <strong>joint soreness</strong> caused by that specific exercise.</li>
                    <li>You'll be asked about the <strong>muscle burn</strong> experienced during that specific exercise.</li>
                </ul>
            </li>
            <li>
                <strong>After the last set for a specific muscle group in the workout:</strong>
                <ul class="list-disc list-inside space-y-1 mt-1 md:mt-2 ml-3 md:ml-4">
                    <li>You'll be asked about the overall <strong>muscle pump</strong> achieved for that muscle group.</li>
                    <li>You'll be asked about the overall perceived <strong>effort/difficulty</strong> for that muscle group.</li>
                </ul>
            </li>
        </ul>
        <div class="space-y-3 md:space-y-4 mt-3 md:mt-4">
            <div class="p-2 border rounded border-surface-500">
                <strong>Recovery:</strong> "When did your &lbrace;muscle_group&rbrace; recover after your last workout?"
                <ul class="list-disc list-inside space-y-1 mt-1 ml-3 md:ml-4">
                    <li>1: Did not get sore</li>
                    <li>2: Recovered a while ago</li>
                    <li>3: Recovered recently</li>
                    <li>4: Still sore</li>
                </ul>
            </div>
            <div class="p-2 border rounded border-surface-500">
                <strong>Joint Soreness:</strong> "How sore did your joints get doing &lbrace;exercise&rbrace;?"
                <ul class="list-disc list-inside space-y-1 mt-1 ml-3 md:ml-4">
                    <li>1: Minimal/None</li>
                    <li>4: Extreme</li>
                    <!-- Add other options if available -->
                </ul>
            </div>
            <div class="p-2 border rounded border-surface-500">
                <strong>Muscle Burn:</strong> "How much of a burn did you feel in your &lbrace;muscle group&rbrace; doing &lbrace;exercise&rbrace;:"
                <ul class="list-disc list-inside space-y-1 mt-1 ml-3 md:ml-4">
                    <li>1: Minimal/None</li>
                    <li>4: Extreme</li>
                </ul>
            </div>
             <div class="p-2 border rounded border-surface-500">
                <strong>Muscle Pump:</strong> "How much of a pump did you get working your &lbrace;muscle group&rbrace;:"
                <ul class="list-disc list-inside space-y-1 mt-1 ml-3 md:ml-4">
                    <li>1: Minimal/None</li>
                    <li>4: Extreme</li>
                </ul>
            </div>
             <div class="p-2 border rounded border-surface-500">
                <strong>Effort/Difficulty:</strong> "How hard, on average, did you find working your &lbrace;muscle group&rbrace;:"
                <ul class="list-disc list-inside space-y-1 mt-1 ml-3 md:ml-4">
                    <li>1: Minimal/None</li>
                    <li>4: Extreme</li>
                </ul>
            </div>
        </div>
    </section>

    <section class="card p-3 md:p-4 preset-tonal-surface">
        <h2 class="h2">Workout Progression</h2>
        <p class="mt-2 md:mt-3">
            Based on your logged sets and feedback (after the first week), the application's progression models will automatically adjust the target weights, reps, or sets for your next workout focusing on the same muscle groups.
        </p>
    </section>

     <section class="card p-3 md:p-4 preset-filled-warning-300-700">
        <h2 class="h2">Final Reminder</h2>
        <p class="mt-2 md:mt-3">
           As mentioned, BASE45 is still evolving. While the core functionality should work, errors can occur. We monitor the application closely and work to fix issues promptly. Thank you for being part of this early phase!
        </p>
    </section>

</div>
