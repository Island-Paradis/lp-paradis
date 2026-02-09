import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center gap-20">
      <div className="flex flex-col gap-12">
        <div className="w-full flex items-center justify-center">
          <div className="flex items-baseline flex-row gap-2 bg-white p-2 px-4 rounded-full backdrop-blur-2xl">
            <span className="w-3 h-3 bg-amber-400 rounded-full" />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Currently under construction
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-11 justify-center items-center w-full">
          <div className="items-center text-center max-w-2xl">
            <h1 className="text-5xl md:text-7xl font-bold text-zinc-900 dark:text-zinc-100 text-center text-pretty">
              We're building <br />
              <span className="underline decoration-gray-600">
                something great
              </span>
            </h1>
          </div>
          <div className="items-center text-center max-w-2xl">
            <p className="text-xl font-medium text-zinc-600 dark:text-zinc-100 px-4">
              We’re building something awesome! Our website is under
              construction and will be back shortly with a fresh new look.
            </p>
          </div>
        </div>
      </div>
      <div>
        <Image
          src="/image/logo.svg"
          alt="paradis labs logo"
          width={200}
          height={200}
        />
      </div>
    </div>
  );
}
