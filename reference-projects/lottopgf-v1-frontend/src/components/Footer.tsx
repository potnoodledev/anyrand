import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="text-center text-sm">
      Powered by{" "}
      <Link
        href="https://lottopgf.org"
        target="_blank"
        className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 hover:no-underline"
      >
        <span>LottoPGF V1</span>
        <Image src="/images/otto.svg" alt="Otto" width={14} height={14} />
      </Link>
    </footer>
  );
}
