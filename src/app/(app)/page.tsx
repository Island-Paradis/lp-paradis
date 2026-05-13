import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import config from "@payload-config";
import { getPayload } from "payload";

export default async function Home() {
  const payload = await getPayload({ config });
  const { hero } = await payload.findGlobal({
    slug: "homepage",
    depth: 1,
    locale: "en",
  });

  return (
    <main>
      {typeof hero?.item === "object" && hero.item && hero.enabled && (
        <Hero {...hero.item} />
      )}
    </main>
  );
}
