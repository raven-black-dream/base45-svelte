import type { PageServerLoad } from "./$types";
import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";

export const load = (async () => {
  return {};
}) satisfies PageServerLoad;

export const actions: Actions = {
  default: async ({ request }) => {
    try {
      const data = await request.formData();
      const programTemplate = JSON.parse(data.get("programTemplate") as string); // Parse the form data

      // Database write logic here (replace with your actual implementation)
      await writeProgramTemplateToDatabase(programTemplate);

      // Optional: redirect after successful submission
      throw redirect(303, "/program-templates");
    } catch (err) {
      return fail(500, { error: "Failed to create program template" });
    }
  },
};

async function writeProgramTemplateToDatabase(programTemplate: any) {
  console.log(programTemplate);
}
