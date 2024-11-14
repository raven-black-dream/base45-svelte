import { join } from "path";
import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";
import { skeleton, contentPath } from '@skeletonlabs/skeleton/plugin';
import * as themes from '@skeletonlabs/skeleton/themes';
import Base45Slytherin  from "./src/base45Slytherin";

export default {
    content: [
        './src/**/*.{html,js,svelte,ts}',
        contentPath(import.meta.url, 'svelte')
    ],
    theme: {
        extend: {},
    },
    plugins: [
        forms,
        skeleton({
            // NOTE: each theme included will be added to your CSS bundle
            themes: [ 
                Base45Slytherin
             ]
        })
    ]
} satisfies Config
