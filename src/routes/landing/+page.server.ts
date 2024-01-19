// src/routes/landing/+page.server.ts

import { redirect } from '@sveltejs/kit'

export const load = async ({ locals: { supabase, getSession } }) => {
  const session = await getSession()

  if (!session) {
    throw redirect(303, '/')
  }

  const { data: mesocycle, error } = await supabase
    .from('mesocycle')
    .select(`
      id,
      start_date,
      end_date,
      meso_day(
        id,
        meso_day_name,
        day_of_week
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
  let start = new Date(mesocycle?.start_date)
  let end = new Date(mesocycle?.end_date)
  let current = start
  while (current.getTime() < end.getTime()) {
    mesocycle?.meso_day.forEach(meso_day => {
      if (current.getDay() === Number(meso_day.day_of_week)) {
        calendar_items.push(
          {
            title: meso_day.meso_day_name,
            id: meso_day.id,
            className: "task--primary",
            date: new Date(current.getTime()),
            len: 1
          }
        )
      }
    });
    current.setDate(current.getDate() + 1)
  }

  return { session, calendar_items }
}
