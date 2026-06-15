import Image from "next/image";
import Link from "next/link";
import type { PopulatedFooter } from "@/service/types";
import Button from "../Button";

export default function Footer(args: PopulatedFooter) {
  return (
    <footer className="w-full flex flex-col justify-center items-center bg-primary text-white">
      <div className="container py-16 flex flex-col gap-10 px-4 xl:px-0">
        <div className="flex flex-col gap-2">
          <Image
            src={args.logo?.url ?? "/logo-white.svg"}
            alt={args.logo?.alt ?? "Paradis Logo"}
            width={163}
            height={31}
          />
          <span className="block text-xs font-normal text-white/80">
            {args.tagline ?? "Because we were born into this world"}
          </span>
        </div>
        <div className="w-full flex flex-row gap-10">
          <div className="w-full sm:grid sm:grid-cols-8 gap-6 flex flex-col">
            {args.linkGroups &&
              args.linkGroups.length > 0 &&
              args.linkGroups.map((group) => (
                <div
                  className="col-span-2 flex flex-col gap-3"
                  key={group.id ?? group.title}
                >
                  <span className="text-white/70 font-medium text-sm">
                    {group.title}
                  </span>
                  <ul className="flex flex-col gap-2">
                    {group.links &&
                      group.links.length > 0 &&
                      group.links.map((link) => (
                        <li key={link.name}>
                          <Link
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-sm font-normal text-white"
                          >
                            {link.name}
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
          </div>
          <div className="flex flex-col gap-4">
            <span className="text-white font-medium text-lg">
              Ready to build?
            </span>
            <div className="flex flex-col gap-3 w-full">
              <Button className="w-full" variant="inverted">
                Get Quote - For Free
              </Button>
              <Button className="w-full" variant="outline-inverted">
                Schedule a Call
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full flex justify-center items-center border-t border-white/20">
        <div className="container py-8 text-sm font-normal px-4 xl:px-0">
          &copy; {new Date().getFullYear()} Paradis.Labs - All rights reserved.
        </div>
      </div>
    </footer>
  );
}
