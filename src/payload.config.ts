import sharp from "sharp";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { s3Storage } from "@payloadcms/storage-s3";
import { buildConfig } from "payload";
import { en } from "@payloadcms/translations/languages/en";
import { pt } from "@payloadcms/translations/languages/pt";

// Collections
import { Media } from "./collections/Media";
import { Hero } from "./collections/Hero";
import { Menu } from "./collections/globals/NavBar";
import { Projects } from "./collections/Projects";
import { Services } from "./collections/Services";
import { Testimonials } from "./collections/Testimonials";
import { FAQs } from "./collections/FAQs";
import { Contact } from "./collections/Contact";
import { HomePage } from "./collections/pages/HomePage";
import { Footer } from "./collections/globals/Footer";

// Pages

export default buildConfig({
  // If you'd like to use Rich Text, pass your editor here
  editor: lexicalEditor(),

  // Collections
  collections: [Media, Hero, Contact, Projects, Services, Testimonials, FAQs],

  // Globals (site-wide settings)
  globals: [HomePage, Menu, Footer],

  localization: {
    locales: [
      { label: "Português", code: "pt" },
      { label: "English", code: "en" },
    ],
    defaultLocale: "en",
    fallback: true,
  },

  i18n: {
    fallbackLanguage: "en", // default
    supportedLanguages: {
      en,
      pt,
    },
  },
  // Your Payload secret - should be a complex and secure string, unguessable
  secret: process.env.PAYLOAD_SECRET || "",
  // Whichever Database Adapter you're using should go here
  // Mongoose is shown as an example, but you can also use Postgres
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || "",
      ssl: { rejectUnauthorized: false },
    },
  }),
  // If you want to resize images, crop, set focal point, etc.
  // make sure to install it and pass it to the config.
  // This is optional - if you don't need to do these things,
  // you don't need it!
  sharp,
  plugins: [
    s3Storage({
      collections: {
        media: true,
      },
      bucket: process.env.S3_BUCKET || "",
      config: {
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
        },
        region: process.env.S3_REGION || "",
        endpoint: process.env.S3_ENDPOINT || "",
        forcePathStyle: true,
        maxAttempts: 3,
        retryMode: "adaptive",
      },
    }),
  ],
});
