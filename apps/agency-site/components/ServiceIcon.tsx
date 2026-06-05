import type { ServiceContent } from "@/app/diensten/content";

type IconKey = ServiceContent["icon"];

const paths: Record<IconKey, React.ReactNode> = {
  websites: (
    <>
      <rect x="2.5" y="4" width="19" height="13" rx="2" />
      <path d="M2.5 9h19" />
      <path d="M9 20h6M12 17v3" />
    </>
  ),
  consultancy: (
    <>
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2.5h6c0-1.3.3-1.8 1-2.5A6 6 0 0 0 12 3Z" />
    </>
  ),
  marketing: (
    <>
      <path d="M4 20V9" />
      <path d="M10 20V5" />
      <path d="M16 20v-7" />
      <path d="M21 4l-4 4-3-2-4 3" />
    </>
  ),
  os: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
};

export default function ServiceIcon({
  icon,
  size = 24,
  className,
}: {
  icon: IconKey;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[icon]}
    </svg>
  );
}
