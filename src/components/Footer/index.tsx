import Image from "next/image";
import Link from "next/link";
import React from "react";
import Button from "../Button";

export default function Footer() {
  const quickLinks = [
    { name: "Home", href: "/" },
    { name: "Products", href: "/products" },
    { name: "Services", href: "/services" },
    {
      name: "Kitenda",
      href: "https://kitenda.paradis.host",
      icon: "external-link",
    },
    {
      name: "Ficha Segura",
      href: "https://ficha-segura.paradis.host",
      icon: "external-link",
    },
  ];

  const companyLinks = [
    { name: "About Us", href: "/about" },
    { name: "Members", href: "/members" },
    { name: "Contacts", href: "/contacts" },
  ];

  const productLinks = [
    {
      name: "Kitenda",
      href: "https://kitenda.paradis.host",
      icon: "external-link",
    },
    {
      name: "Ficha Segura",
      href: "https://ficha-segura.paradis.host",
      icon: "external-link",
    },
  ];

  return (
    <footer className="w-full flex flex-col justify-center items-center bg-primary text-white">
      <div className="container py-16 flex flex-col gap-10">
        <div className="flex flex-col gap-2">
          <Image
            src="/logo-white.svg"
            alt="Paradis Logo"
            width={163}
            height={31}
          />
          <span className="block text-xs font-normal text-white/80">
            Because we were born into this world
          </span>
        </div>
        <div className="w-full flex flex-row gap-10">
          <div className="w-full grid grid-cols-8 gap-6">
            <div className="col-span-2 flex flex-col gap-3">
              <span className="text-white/70 font-medium text-sm">
                Quick Links
              </span>
              <ul className="flex flex-col gap-2">
                {quickLinks.map((link) => (
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
            <div className="col-span-2 flex flex-col gap-3">
              <span className="text-white/70 font-medium text-sm">Company</span>
              <ul className="flex flex-col gap-2">
                {companyLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="flex items-center text-sm font-normal text-white"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="col-span-2 flex flex-col gap-3">
              <span className="text-white/70 font-medium text-sm">
                Products
              </span>
              <ul className="flex flex-col gap-2">
                {productLinks.map((link) => (
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
          </div>
          <div className="flex flex-col gap-4">
            <span className="text-white font-medium text-lg">
              Ready to build?
            </span>
            <div className="flex flex-col gap-3 w-full">
              <Button
                className="w-full bg-white text-primary"
                variant="primary"
              >
                Get Quote - For Free
              </Button>
              <Button
                className="w-full text-white border border-white"
                variant="outline"
              >
                Schedule a Call
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full flex justify-center items-center border-t border-white/20">
        <div className="container py-8 text-sm font-normal">
          &copy; {new Date().getFullYear()} Paradis.Labs - All rights reserved.
        </div>
      </div>
    </footer>
  );
}
