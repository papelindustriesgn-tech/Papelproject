import Image from "next/image";
import green from "../../../public/brand/papel-industrie-green.png";
import white from "../../../public/brand/papel-industrie-white.png";

export function Logo({ tone = "green", className }: { tone?: "green" | "white"; className?: string }) {
  return (
    <Image
      src={tone === "green" ? green : white}
      alt="Papel Industrie"
      className={className}
      sizes="160px"
      priority={tone === "green"}
    />
  );
}
