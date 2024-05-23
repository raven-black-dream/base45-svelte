// src/routes/landing/+page.server.ts

import { redirect } from '@sveltejs/kit'

export const load = async ({ locals: { supabase, getSession } }) => {
  const session = await getSession()

  if (!session) {
    redirect(303, '/');
  }

  const { data: mesocycle, error } = await supabase
    .from('mesocycle')
    .select(`
      id,
      start_date,
      end_date,
      workouts(
        id,
        day_name,
        date,
        complete
      )
    `)  
    .eq('user', session.user.id)
    .eq('current', true)
    .limit(1)
    .single()

  // turn a mesocycle into a list of calendar calendar_items
  // ({ title: string; className: string; date: Date; len: number; 
  // isBottom?: boolean; detailHeader?: string; detailContent?: string; vlen?: number; 
  // startCol?: number; startRow?: number;})
  
  let calendar_items: { title: any; id: any; className: string; date: Date; len: number }[] = []
  mesocycle?.workouts.forEach(workout => {
    calendar_items.push(
      {
        title: workout.day_name,
        id: workout.id,
        className: "task--primary", // can make styling here conditional on 'complete' 
        date: new Date(workout.date),
        len: 1
      }
    )
  });

  return { session, calendar_items }
}
