import MarketTabs from "@/components/MarketTabs";

export default function MarketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="market">
      <div className="container">
        <MarketTabs />
      </div>
      {children}
    </div>
  );
}
