import { METADATA } from "@/config";
import Image from "next/image";

export function Banner() {
  if (!METADATA.bannerImage) {
    return null;
  }

  return (
    <div className="space-y-14">
      <Image
        src={METADATA.bannerImage}
        width={720}
        height={450}
        alt=""
        className="mx-auto aspect-[720/450] w-full rounded-3xl object-cover"
        priority
      />
      <div className="space-y-4">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          {METADATA.name}
        </h1>
        <div>{METADATA.longDescription}</div>
      </div>
    </div>
  );
}
