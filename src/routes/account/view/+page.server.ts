import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import * as Plot from "@observablehq/plot";
import { JSDOM } from "jsdom";

const { document } = new JSDOM().window;

export const load = (async ({ locals: { supabase, getSession } }) => {
  const session = await getSession();

  if (!session) {
    redirect(303, "/");
  }

  console.log("loading");
  const { data: profile } = await supabase
    .from("users")
    .select(`display_name, gender, date_of_birth`)
    .eq("id", session.user.id)
    .single();

  const { data: weightHistory } = await supabase
    .from("user_weight_history")
    .select("date, value")
    .eq("user", session.user.id)
    .order("date", { ascending: true });

  const { data: workoutHistory } = await supabase
    .from("workouts")
    .select("*")
    .eq("user", session.user.id)
    .eq("complete", true)
    .order("date", { ascending: false });

  const weightHistoryData = weightHistory?.forEach((row) => {
    row.date = new Date(row.date);
  });

  const plot = weightHistory
    ? Plot.plot({
        marks: [Plot.line(weightHistory, { x: "date", y: "value" })],
        document,
      }).outerHTML
    : null;

  return { session, profile, plot, workoutHistory };
}) satisfies PageServerLoad;

export const actions = {
  async addWeight({ locals: { supabase, getSession }, params, request }) {
    const session = await getSession();

    if (!session) {
      redirect(303, "/");
    }

    const data = await request.formData();
    const date = new Date(data.get("date"));
    const weightValue = {
      value: Number(data.get("value")),
      unit: data.get("unit"),
      date: date,
      user: session.user.id,
    };
    const {} = await supabase.from("user_weight_history").insert(weightValue);
  },
};
